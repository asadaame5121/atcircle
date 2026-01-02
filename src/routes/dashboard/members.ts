import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { AtProtoService } from "../../services/atproto.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// GET /dashboard/ring/members/list?ring_uri=...
app.get("/list", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const ringUri = c.req.query("ring_uri");

    if (!ringUri) {
        return c.json({ success: false, error: "ring_uri required" }, 400);
    }

    // 1. Ownership check
    const ring = (await c.env.DB.prepare(
        "SELECT * FROM rings WHERE uri = ? AND (owner_did = ? OR admin_did = ?)",
    )
        .bind(ringUri, did, did)
        .first()) as any;

    if (!ring) return c.json({ success: false, error: "Unauthorized" }, 403);

    // 2. Fetch members from local DB
    const members = (await c.env.DB.prepare(`
        SELECT m.id, m.member_uri, s.url, s.title, s.user_did, m.status, m.created_at
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
            const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
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
            console.error("Failed to fetch member profiles:", e);
        }
    }

    return c.json({
        success: true,
        members: memberList,
    });
});

// POST /dashboard/ring/members/kick
app.post("/kick", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const ringUri = body.ring_uri as string;
    const memberDid = body.member_did as string;

    if (!ringUri || !memberDid) {
        return c.json({ success: false, error: "Missing parameters" }, 400);
    }

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
        console.error("Kick failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// POST /dashboard/ring/members/block
app.post("/block", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const ringUri = body.ring_uri as string;
    const memberDid = body.member_did as string;
    const reason = (body.reason as string) || "Blocked by owner";

    if (!ringUri || !memberDid) {
        return c.json({ success: false, error: "Missing parameters" }, 400);
    }

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
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
        console.log(`[Block] Blocking ${memberDid} from ring ${ringUri}`);
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
        console.error("Block failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// POST /dashboard/ring/members/update
app.post("/update", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const ringUri = body.ring_uri as string;
    const memberDid = body.member_did as string;
    const status = body.status as "approved" | "pending" | "suspended";

    if (!ringUri || !memberDid || !status) {
        return c.json({ success: false, error: "Missing parameters" }, 400);
    }

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
        console.error("Update failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

export default app;
