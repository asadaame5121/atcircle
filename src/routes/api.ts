import { Hono } from "hono";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Get ring info and members (by URI or slug)
app.get("/rings/:uri", async (c) => {
    const rawUri = c.req.param("uri");
    if (!rawUri) return c.json({ error: "Missing ring URI" }, 400);

    const decodedUri = decodeURIComponent(rawUri);

    // Fetch ring info by URI or slug
    let ring = await c.env.DB.prepare("SELECT * FROM rings WHERE uri = ?")
        .bind(decodedUri)
        .first<any>();

    if (!ring) {
        ring = await c.env.DB.prepare("SELECT * FROM rings WHERE slug = ?")
            .bind(decodedUri)
            .first<any>();
    }

    if (!ring) return c.json({ error: "Ring not found" }, 404);

    // Fetch members
    const members = await c.env.DB.prepare(`
        SELECT s.id, s.title, s.url, s.rss_url, s.description, m.member_uri
        FROM sites s
        JOIN memberships m ON s.id = m.site_id
        WHERE m.ring_uri = ? AND s.is_active = 1 AND m.status = 'approved'
        GROUP BY s.id
        ORDER BY m.created_at ASC
    `)
        .bind(ring.uri)
        .all<any>();

    const memberList = (members.results || []).map((m) => ({
        uri: m.member_uri || `member-${m.id}`,
        url: m.url,
        title: m.title,
        description: m.description,
        rssUrl: m.rss_url,
    }));

    return c.json({
        uri: ring.uri,
        title: ring.title,
        description: ring.description,
        banner_url: ring.banner_url,
        slug: ring.slug,
        owner: ring.owner_did,
        created_at: ring.created_at,
        members: memberList,
    });
});

export default app;
