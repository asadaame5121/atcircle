import { AtUri } from "@atproto/api";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import {
    createRingSchema,
    joinRingSchema,
    ringActionSchema,
    ringUpdateSchema,
} from "../../schemas/index.js";
import { AtProtoService } from "../../services/atproto.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/ring/create
app.post("/create", zValidator("form", createRingSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { title, description } = c.req.valid("form");

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        const ringUri = await AtProtoService.createRing(
            agent,
            title,
            description,
        );

        // 1. Save to local DB
        await c.env.DB.prepare(
            "INSERT INTO rings (uri, owner_did, admin_did, title, description, acceptance_policy, status) VALUES (?, ?, ?, ?, ?, 'automatic', 'open')",
        )
            .bind(ringUri, did, did, title, description)
            .run();

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
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
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

        // 1. Fetch Ring Metadata and Save/Update locally
        let acceptancePolicy = "automatic";
        try {
            const ringData = await AtProtoService.getRing(agent, ringUri);
            acceptancePolicy = ringData.value.acceptancePolicy || "automatic";

            await c.env.DB.prepare(
                "INSERT OR REPLACE INTO rings (uri, owner_did, title, description, acceptance_policy, status) VALUES (?, ?, ?, ?, ?, ?)",
            )
                .bind(
                    ringUri,
                    new AtUri(ringUri).hostname,
                    ringData.value.title,
                    ringData.value.description || null,
                    acceptancePolicy,
                    ringData.value.status || "open",
                )
                .run();
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

        return c.redirect(`/dashboard?msg=joined&policy=${acceptancePolicy}`);
    } catch (e) {
        pinoLogger.error({ msg: "Error joining ring", error: e });
        return c.text("Failed to join ring", 500);
    }
});

// POST /dashboard/ring/leave
app.post("/leave", zValidator("form", ringActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { uri: memberUri } = c.req.valid("form");

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        await AtProtoService.leaveRing(agent, memberUri);

        // Remove from local DB
        await c.env.DB.prepare("DELETE FROM memberships WHERE member_uri = ?")
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
    } = c.req.valid("form");
    const slug = rawSlug?.trim().toLowerCase() || null;

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 1. Update Repository (ATProto)
        await AtProtoService.updateRing(
            agent,
            uri,
            title,
            description,
            status,
            acceptance,
            adminDid,
        );

        // 2. Update AppView (Indexer)
        await c.env.DB.prepare(
            "UPDATE rings SET acceptance_policy = ?, status = ?, admin_did = ?, slug = ? WHERE uri = ?",
        )
            .bind(acceptance, status, adminDid, slug, uri)
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
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
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

// GET /dashboard/ring/invite/friends
app.get("/invite/friends", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const result = await AtProtoService.getFollowers(agent, did);

        return c.json({
            success: true,
            follows: result.followers,
        });
    } catch (e) {
        pinoLogger.error({ msg: "Error fetching follows", error: e });
        return c.json(
            { success: false, error: (e as any).message || "Internal Error" },
            500,
        );
    }
});

export default app;
