import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import {
    blockActionSchema,
    memberActionSchema,
    memberQuerySchema,
    memberUpdateSchema,
} from "../../schemas/index.js";
import { AtProtoService } from "../../services/atproto.js";
import { verifyWidget } from "../../services/discovery.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// GET /dashboard/ring/members/list?ring_uri=...
app.get("/list", zValidator("query", memberQuerySchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { ring_uri: ringUri } = c.req.valid("query");

    // 1. Ownership check
    const ring = (await c.env.DB.prepare(
        "SELECT * FROM rings WHERE uri = ? AND (owner_did = ? OR admin_did = ?)",
    )
        .bind(ringUri, did, did)
        .first()) as any;

    if (!ring) return c.json({ success: false, error: "Unauthorized" }, 403);

    // 2. Fetch members from local DB
    const members = (await c.env.DB.prepare(`
        SELECT m.id, m.member_uri, s.url, s.title, s.user_did, m.status, 
               m.widget_installed, m.last_verified_at, m.created_at
        FROM memberships m
        JOIN sites s ON m.site_id = s.id
        WHERE m.ring_uri = ?
        GROUP BY s.id
        ORDER BY m.created_at DESC
    `)
        .bind(ringUri)
        .all()) as any;

    const memberList = members.results || [];

    // 3. Enrich with profile data
    if (memberList.length > 0) {
        try {
            const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
            if (agent) {
                const dids = memberList.map((m: any) => m.user_did);
                const profileResult = await AtProtoService.getProfiles(
                    agent,
                    dids,
                );
                const profileMap = new Map(
                    profileResult.profiles.map((p) => [p.did, p]),
                );

                for (const m of memberList) {
                    const profile = profileMap.get(m.user_did);
                    if (profile) {
                        m.handle = profile.handle;
                        m.displayName = profile.displayName;
                        m.avatar = profile.avatar;
                    }
                }
            }
        } catch (e) {
            pinoLogger.error({
                msg: "Failed to fetch member profiles",
                error: e,
            });
        }
    }

    return c.json({
        success: true,
        members: memberList,
    });
});

// POST /dashboard/ring/members/kick
app.post("/kick", zValidator("form", memberActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { ring_uri: ringUri, member_did: memberDid } = c.req.valid("form");

    try {
        // 1. Ownership check
        const ring = (await c.env.DB.prepare(
            "SELECT * FROM rings WHERE uri = ? AND (owner_did = ? OR admin_did = ?)",
        )
            .bind(ringUri, did, did)
            .first()) as any;

        if (!ring) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        // 2. Local DB: Cleanup
        // We delete ALL memberships for this user in this ring
        await c.env.DB.prepare(
            "DELETE FROM memberships WHERE ring_uri = ? AND site_id IN (SELECT id FROM sites WHERE user_did = ?)",
        )
            .bind(ringUri, memberDid)
            .run();

        return c.json({ success: true });
    } catch (e: any) {
        pinoLogger.error({ msg: "Kick failed", error: e });
        return c.json({ success: false, error: e.message }, 500);
    }
});

// POST /dashboard/ring/members/block
app.post("/block", zValidator("form", blockActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const {
        ring_uri: ringUri,
        member_did: memberDid,
        reason: rawReason,
    } = c.req.valid("form");
    const reason = rawReason || "Blocked by owner";

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) {
            return c.json(
                { success: false, error: "Agent restoration failed" },
                401,
            );
        }

        // 1. Ownership check
        const ring = (await c.env.DB.prepare(
            "SELECT * FROM rings WHERE uri = ? AND (owner_did = ? OR admin_did = ?)",
        )
            .bind(ringUri, did, did)
            .first()) as any;
        if (!ring) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        // 2. ATProto: Create Block record
        pinoLogger.info({
            msg: "[Block] Blocking member from ring",
            memberDid,
            ringUri,
        });
        await AtProtoService.blockMember(agent, ringUri, memberDid, reason);

        // 3. Local DB: Cleanup and Record Block
        await c.env.DB.batch([
            c.env.DB.prepare(
                "DELETE FROM memberships WHERE ring_uri = ? AND site_id IN (SELECT id FROM sites WHERE user_did = ?)",
            ).bind(ringUri, memberDid),
            c.env.DB.prepare(
                "INSERT OR IGNORE INTO block_records (uri, ring_uri, subject_did) VALUES (?, ?, ?)",
            ).bind(`local-block-${Date.now()}`, ringUri, memberDid),
        ]);

        return c.json({ success: true });
    } catch (e: any) {
        pinoLogger.error({ msg: "Block failed", error: e });
        return c.json({ success: false, error: e.message }, 500);
    }
});

// POST /dashboard/ring/members/update
app.post("/update", zValidator("form", memberUpdateSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const {
        ring_uri: ringUri,
        member_did: memberDid,
        status,
    } = c.req.valid("form");

    try {
        // 1. Ownership check
        const ring = (await c.env.DB.prepare(
            "SELECT * FROM rings WHERE uri = ? AND (owner_did = ? OR admin_did = ?)",
        )
            .bind(ringUri, did, did)
            .first()) as any;

        if (!ring) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        // 2. Local DB: Update membership status
        await c.env.DB.prepare(`
            UPDATE memberships 
            SET status = ? 
            WHERE ring_uri = ? AND site_id IN (SELECT id FROM sites WHERE user_did = ?)
        `)
            .bind(status, ringUri, memberDid)
            .run();

        return c.json({ success: true });
    } catch (e: any) {
        pinoLogger.error({ msg: "Update failed", error: e });
        return c.json({ success: false, error: e.message }, 500);
    }
});

// POST /dashboard/ring/members/verify
app.post("/verify", zValidator("form", memberActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { ring_uri: ringUri, member_did: memberDid } = c.req.valid("form");

    try {
        // 1. Ownership check
        const ring = (await c.env.DB.prepare(
            "SELECT * FROM rings WHERE uri = ? AND (owner_did = ? OR admin_did = ?)",
        )
            .bind(ringUri, did, did)
            .first()) as any;

        if (!ring) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        // 2. Get member site URL
        const memberSite = (await c.env.DB.prepare(`
            SELECT s.url FROM sites s
            JOIN memberships m ON s.id = m.site_id
            WHERE m.ring_uri = ? AND s.user_did = ?
        `)
            .bind(ringUri, memberDid)
            .first()) as { url: string } | null;

        if (!memberSite) {
            return c.json(
                { success: false, error: "Member site not found" },
                404,
            );
        }

        // 3. Verify widget
        const isInstalled = await verifyWidget(memberSite.url, ringUri);

        // 4. Update DB
        await c.env.DB.prepare(`
            UPDATE memberships
            SET widget_installed = ?, last_verified_at = ?
            WHERE ring_uri = ? AND site_id IN (SELECT id FROM sites WHERE user_did = ?)
        `)
            .bind(
                isInstalled ? 1 : 0,
                Math.floor(Date.now() / 1000),
                ringUri,
                memberDid,
            )
            .run();

        return c.json({
            success: true,
            widget_installed: isInstalled,
            last_verified_at: Math.floor(Date.now() / 1000),
        });
    } catch (e: any) {
        pinoLogger.error({ msg: "Verification failed", error: e });
        return c.json({ success: false, error: e.message }, 500);
    }
});

export default app;
