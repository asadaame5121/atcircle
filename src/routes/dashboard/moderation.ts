import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { AtProtoService } from "../../services/atproto.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/ring/approve
app.post("/approve", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const memberUri = body.member_uri as string;

    if (!memberUri) return c.text("Member URI required", 400);

    // Verify ownership/admin
    const membership = (await c.env.DB.prepare(`
        SELECT m.id, r.owner_did, r.admin_did 
        FROM memberships m 
        JOIN rings r ON m.ring_uri = r.uri 
        WHERE m.member_uri = ?
    `)
        .bind(memberUri)
        .first()) as {
        id: number;
        owner_did: string;
        admin_did: string | null;
    };

    if (
        !membership ||
        (membership.owner_did !== did && membership.admin_did !== did)
    ) {
        return c.text("Unauthorized or membership not found", 403);
    }

    await c.env.DB.prepare(
        "UPDATE memberships SET status = 'approved' WHERE id = ?",
    )
        .bind(membership.id)
        .run();

    return c.redirect("/dashboard?msg=approved");
});

// POST /dashboard/ring/request/approve
app.post("/request/approve", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const requestId = body.request_id as string;

    if (!requestId) return c.text("Request ID required", 400);

    const request = (await c.env.DB.prepare(`
        SELECT jr.*, r.owner_did, r.admin_did
        FROM join_requests jr
        JOIN rings r ON jr.ring_uri = r.uri
        WHERE jr.id = ?
    `)
        .bind(requestId)
        .first()) as any;

    if (!request || (request.owner_did !== did && request.admin_did !== did)) {
        return c.text("Unauthorized or request not found", 403);
    }

    // Convert request to a membership (locally approved)
    let siteId = (await c.env.DB.prepare(
        "SELECT id FROM sites WHERE user_did = ?",
    )
        .bind(request.user_did)
        .first()) as { id: number } | null;

    if (!siteId) {
        const res = await c.env.DB.prepare(
            "INSERT INTO sites (user_did, url, title, rss_url, is_active) VALUES (?, ?, ?, ?, 1)",
        )
            .bind(
                request.user_did,
                request.site_url,
                request.site_title,
                request.rss_url,
            )
            .run();
        siteId = { id: Number(res.meta.last_row_id) };
    }

    await c.env.DB.batch([
        c.env.DB.prepare(
            "INSERT OR REPLACE INTO memberships (ring_uri, site_id, member_uri, status) VALUES (?, ?, ?, ?)",
        ).bind(request.ring_uri, siteId.id, request.atproto_uri, "approved"),
        c.env.DB.prepare(
            "UPDATE join_requests SET status = 'approved' WHERE id = ?",
        ).bind(requestId),
    ]);

    return c.redirect("/dashboard?msg=approved");
});

// POST /dashboard/ring/request/reject
app.post("/request/reject", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const requestId = body.request_id as string;

    if (!requestId) return c.text("Request ID required", 400);

    const request = (await c.env.DB.prepare(`
        SELECT jr.*, r.owner_did, r.admin_did
        FROM join_requests jr
        JOIN rings r ON jr.ring_uri = r.uri
        WHERE jr.id = ?
    `)
        .bind(requestId)
        .first()) as any;

    if (!request || (request.owner_did !== did && request.admin_did !== did)) {
        return c.text("Unauthorized or request not found", 403);
    }

    await c.env.DB.prepare(
        "UPDATE join_requests SET status = 'rejected' WHERE id = ?",
    )
        .bind(requestId)
        .run();

    return c.redirect("/dashboard?msg=rejected");
});

// POST /dashboard/ring/reject
app.post("/reject", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const memberUri = body.member_uri as string;

    if (!memberUri) return c.text("Member URI required", 400);

    // Verify ownership/admin
    const membership = (await c.env.DB.prepare(`
        SELECT m.id, r.owner_did, r.admin_did 
        FROM memberships m 
        JOIN rings r ON m.ring_uri = r.uri 
        WHERE m.member_uri = ?
    `)
        .bind(memberUri)
        .first()) as {
        id: number;
        owner_did: string;
        admin_did: string | null;
    };

    if (
        !membership ||
        (membership.owner_did !== did && membership.admin_did !== did)
    ) {
        return c.text("Unauthorized or membership not found", 403);
    }

    await c.env.DB.prepare("DELETE FROM memberships WHERE id = ?")
        .bind(membership.id)
        .run();

    return c.redirect("/dashboard?msg=rejected");
});

// POST /dashboard/ring/unblock
app.post("/unblock", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const blockUri = body.uri as string;

    if (!blockUri) return c.text("Block URI required", 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        await AtProtoService.unblock(agent, blockUri);

        // Remove from local DB
        await c.env.DB.prepare("DELETE FROM block_records WHERE uri = ?")
            .bind(blockUri)
            .run();

        return c.redirect("/dashboard?msg=unblocked");
    } catch (e) {
        console.error("Error unblocking user:", e);
        return c.text("Failed to unblock", 500);
    }
});

export default app;
