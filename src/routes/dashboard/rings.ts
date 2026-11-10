import { AtUri } from "@atproto/api";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import { RingRepository } from "../../repositories/ring.repository.js";
import {
    createRingSchema,
    joinRingSchema,
    ringActionSchema,
    ringUpdateSchema,
} from "../../schemas/index.js";
import { AtProtoService } from "../../services/atproto.js";
import { MembershipActions } from "../../services/membership-actions.js";
import { restoreAgent } from "../../services/oauth.js";
import { isOwnedBy } from "../../services/ring.service.js";
import { ringIndex } from "../../services/ring-index.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/ring/create
app.post("/create", zValidator("form", createRingSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { title, description } = c.req.valid("form");

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        const ringUri = await AtProtoService.createRing(
            agent,
            title,
            description || "",
        );

        // 1. Save to local DB
        await new RingRepository(c.env.DB).upsertFromRecord(ringUri, {
            title,
            description,
            admin: did,
            status: "open",
            acceptancePolicy: "automatic",
        });

        // 2. UX Improvement: Auto-join my own site
        const mySite = (await c.env.DB.prepare(
            "SELECT * FROM sites WHERE user_did = ?",
        )
            .bind(did)
            .first()) as any;
        if (mySite && ringUri) {
            pinoLogger.info({
                msg: "[AutoJoin] Automatically joining site to new ring",
                did,
                ringUri,
            });
            try {
                const memberUri = await AtProtoService.joinRing(
                    agent,
                    ringUri,
                    {
                        url: mySite.url,
                        title: mySite.title,
                        rss: mySite.rss_url || "",
                    },
                );

                // Save membership locally
                await c.env.DB.prepare(
                    "INSERT INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)",
                )
                    .bind(ringUri, mySite.id, memberUri)
                    .run();
            } catch (joinError) {
                pinoLogger.error({
                    msg: "Failed to auto-join ring",
                    error: joinError,
                });
            }
        }
    } catch (e) {
        pinoLogger.error({ msg: "Error creating ring", error: e });
        return c.text("Failed to create ring", 500);
    }

    return c.redirect("/dashboard?msg=created");
});

// POST /dashboard/ring/join
app.post("/join", zValidator("form", joinRingSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { ring_uri: ringUri, url, title, rss } = c.req.valid("form");

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 0. Check for existing membership or request
        const existing = await c.env.DB.prepare(`
            SELECT 1 FROM memberships m 
            JOIN sites s ON m.site_id = s.id
            WHERE m.ring_uri = ? AND s.user_did = ? AND m.status = 'approved'
            UNION ALL
            SELECT 1 FROM join_requests WHERE ring_uri = ? AND user_did = ? AND status = 'pending'
            LIMIT 1
        `)
            .bind(ringUri, did, ringUri, did)
            .first();

        if (existing) {
            return c.redirect("/dashboard?msg=already_joined_or_requested");
        }

        // 0.5 サイト未登録なら、参加フォームに入力されたサイトを登録する
        const registered = await c.env.DB.prepare(
            "SELECT id FROM sites WHERE user_did = ?",
        )
            .bind(did)
            .first();
        if (!registered) {
            await c.env.DB.prepare(
                "INSERT INTO sites (user_did, url, title, rss_url, is_active) VALUES (?, ?, ?, ?, 1)",
            )
                .bind(did, url, title, rss || null)
                .run();
        }

        // 1. Fetch Ring Metadata and Save/Update locally
        let acceptancePolicy = "automatic";
        try {
            const ringData = await AtProtoService.getRing(agent, ringUri);
            acceptancePolicy = ringData.value.acceptancePolicy || "automatic";

            await new RingRepository(c.env.DB).upsertFromRecord(
                ringUri,
                ringData.value,
            );
        } catch (ringError) {
            pinoLogger.error({
                msg: "Failed to fetch ring metadata during join",
                ringUri,
                error: ringError,
            });
            // Fallback to local DB if available
            const localRing = (await c.env.DB.prepare(
                "SELECT acceptance_policy FROM rings WHERE uri = ?",
            )
                .bind(ringUri)
                .first()) as any;
            if (localRing) {
                acceptancePolicy = localRing.acceptance_policy;
            }
        }

        let finalUri = "";
        let finalStatus = "approved";

        if (acceptancePolicy === "manual") {
            finalUri = await AtProtoService.createJoinRequest(agent, ringUri, {
                url,
                title,
                rss,
            });
            finalStatus = "pending";

            // Save to join_requests table
            await c.env.DB.prepare(
                "INSERT INTO join_requests (ring_uri, user_did, site_url, site_title, rss_url, atproto_uri, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
            )
                .bind(ringUri, did, url, title, rss || null, finalUri)
                .run();
        } else {
            finalUri = await AtProtoService.joinRing(agent, ringUri, {
                url,
                title,
                rss,
            });
            finalStatus = "approved";

            // Save membership locally
            const mySite = (await c.env.DB.prepare(
                "SELECT id FROM sites WHERE user_did = ?",
            )
                .bind(did)
                .first()) as { id: number };
            if (mySite) {
                await c.env.DB.prepare(
                    "INSERT OR IGNORE INTO memberships (ring_uri, site_id, member_uri, status) VALUES (?, ?, ?, ?)",
                )
                    .bind(ringUri, mySite.id, finalUri, finalStatus)
                    .run();
            }
        }

        ringIndex.invalidate(ringUri);
        return c.redirect(`/dashboard?msg=joined&policy=${acceptancePolicy}`);
    } catch (e: any) {
        pinoLogger.error({
            msg: "Error joining ring",
            error: e,
            ringUri,
            did,
            stack: e.stack,
        });

        const errorMessage =
            e instanceof Error && e.message.includes("Invalid")
                ? e.message
                : "An unexpected error occurred.";

        return c.text(`Failed to join ring: ${errorMessage}`, 500);
    }
});

// POST /dashboard/ring/leave
app.post("/leave", zValidator("form", ringActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { uri: memberUri } = c.req.valid("form");

    // 参加レコードは本人のリポジトリにある。他人の参加は消させない
    if (!isOwnedBy(memberUri, did)) {
        return c.text("Unauthorized or membership not found", 403);
    }

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        await AtProtoService.leaveRing(agent, memberUri);

        const row = await c.env.DB.prepare(
            "SELECT ring_uri FROM memberships WHERE member_uri = ? UNION SELECT ring_uri FROM join_requests WHERE atproto_uri = ?",
        )
            .bind(memberUri, memberUri)
            .first<{ ring_uri: string }>();
        if (row?.ring_uri) ringIndex.invalidate(row.ring_uri);

        // Remove from local DB
        await c.env.DB.prepare("DELETE FROM memberships WHERE member_uri = ?")
            .bind(memberUri)
            .run();
        await c.env.DB.prepare(
            "UPDATE join_requests SET status = 'withdrawn' WHERE atproto_uri = ?",
        )
            .bind(memberUri)
            .run();

        return c.redirect("/dashboard?msg=left");
    } catch (e) {
        pinoLogger.error({ msg: "Error leaving ring", error: e });
        return c.text("Failed to leave ring", 500);
    }
});

// POST /dashboard/ring/update
app.post("/update", zValidator("form", ringUpdateSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const {
        uri,
        title,
        description,
        status,
        acceptance_policy: acceptance,
        admin_did: adminDid,
        slug: rawSlug,
        banner_url: bannerUrl,
    } = c.req.valid("form");
    const slug = rawSlug?.trim().toLowerCase() || null;

    // リングレコードは所有者のリポジトリにしか存在しない。URI の DID が
    // ログイン中の DID と一致しない限り更新させない (admin_did の乗っ取り防止)。
    if (new AtUri(uri).hostname !== did) {
        return c.text("Unauthorized or ring not found", 403);
    }

    const ringRepo = new RingRepository(c.env.DB);
    if (slug && (await ringRepo.isSlugTaken(slug, uri))) {
        return c.redirect("/dashboard?msg=slug_taken");
    }

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 自動承認 → 要承認に切り替えると、承認の decision がない既存メンバーは
        // 保留扱いになる。切り替え前の一覧を取っておき、承認を記録する。
        const before = await ringIndex.getMemberships(uri).catch(() => null);

        // 1. Update Repository (ATProto)
        await AtProtoService.updateRing(agent, uri, {
            title,
            description: description || "",
            status,
            acceptancePolicy: acceptance,
            admin: adminDid as `did:${string}:${string}`,
            slug,
            bannerUrl: bannerUrl || null,
        });

        ringIndex.invalidate(uri);

        if (
            acceptance === "manual" &&
            before &&
            before.ring.value.acceptancePolicy !== "manual"
        ) {
            for (const m of before.memberships) {
                if (m.status !== "approved" || m.kind !== "member") continue;
                await MembershipActions.decide(
                    agent,
                    uri,
                    m.subjectUri,
                    "approved",
                ).catch((e) =>
                    pinoLogger.error({
                        msg: "Failed to keep member approved on policy switch",
                        subject: m.subjectUri,
                        error: e,
                    }),
                );
            }
        }

        // 2. キャッシュ (DB) も同じ内容にする。空欄は削除を意味するので
        //    upsert ではなく値をそのまま書く。
        await c.env.DB.prepare(
            "UPDATE rings SET title = ?, description = ?, acceptance_policy = ?, status = ?, admin_did = ?, slug = ?, banner_url = ? WHERE uri = ?",
        )
            .bind(
                title,
                description || null,
                acceptance,
                status,
                adminDid,
                slug,
                bannerUrl || null,
                uri,
            )
            .run();
    } catch (e) {
        pinoLogger.error({ msg: "Error updating circle", error: e });
        return c.text("Failed to update circle", 500);
    }

    return c.redirect("/dashboard?msg=updated");
});

// POST /dashboard/ring/delete
app.post("/delete", zValidator("form", ringActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { uri } = c.req.valid("form");

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 1. Verify ownership (simple check: hostname of URI should match DID)
        // More robust: check existing local DB record
        const ring = (await c.env.DB.prepare(
            "SELECT owner_did FROM rings WHERE uri = ?",
        )
            .bind(uri)
            .first()) as { owner_did: string } | null;

        if (!ring || ring.owner_did !== did) {
            return c.text("Unauthorized or ring not found", 403);
        }

        // 2. Delete from ATProto
        await AtProtoService.deleteRing(agent, uri);

        // 3. Delete owner's own member record from ATProto if exists
        const myMembership = (await c.env.DB.prepare(
            "SELECT member_uri FROM memberships m JOIN sites s ON m.site_id = s.id WHERE m.ring_uri = ? AND s.user_did = ?",
        )
            .bind(uri, did)
            .first()) as { member_uri: string } | null;

        if (myMembership) {
            pinoLogger.info({
                msg: "[Delete] Deleting owner's member record",
                memberUri: myMembership.member_uri,
            });
            await AtProtoService.leaveRing(agent, myMembership.member_uri);
        }

        // 4. Delete from Local DB
        // Using batch to ensure atomicity for related data
        await c.env.DB.batch([
            c.env.DB.prepare("DELETE FROM memberships WHERE ring_uri = ?").bind(
                uri,
            ),
            c.env.DB.prepare(
                "DELETE FROM join_requests WHERE ring_uri = ?",
            ).bind(uri),
            c.env.DB.prepare(
                "DELETE FROM block_records WHERE ring_uri = ?",
            ).bind(uri),
            c.env.DB.prepare("DELETE FROM rings WHERE uri = ?").bind(uri),
        ]);
    } catch (e) {
        pinoLogger.error({ msg: "Error deleting ring", error: e });
        return c.text("Failed to delete ring", 500);
    }

    return c.redirect("/dashboard?msg=deleted");
});

export default app;
