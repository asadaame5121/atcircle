import { Hono } from "hono";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Get ring info and members
app.get("/rings/:uri", async (c) => {
    const ringUri = c.req.param("uri");
    if (!ringUri) return c.json({ error: "Missing ring URI" }, 400);

    // Fetch ring info
    const ring = await c.env.DB.prepare("SELECT * FROM rings WHERE uri = ?")
        .bind(ringUri)
        .first<any>();

    if (!ring) return c.json({ error: "Ring not found" }, 404);

    // Fetch members
    const members = await c.env.DB.prepare(`
        SELECT s.title, s.url, s.rss_url, s.description
        FROM sites s
        JOIN memberships m ON s.id = m.site_id
        WHERE m.ring_uri = ? AND s.is_active = 1 AND m.status = 'approved'
        GROUP BY s.id
        ORDER BY m.created_at ASC
    `)
        .bind(ringUri)
        .all<any>();

    return c.json({
        uri: ring.uri,
        title: ring.title,
        description: ring.description,
        banner_url: ring.banner_url,
        slug: ring.slug,
        owner: ring.owner_did,
        created_at: ring.created_at,
        members: members.results || [],
    });
});

export default app;
