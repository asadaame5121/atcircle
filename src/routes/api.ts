import { Hono } from "hono";
import { findRing, refreshRingCache } from "../services/ring-cache.js";
import { getApprovedMembers } from "../services/ring-members.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Get ring info and members (by URI or slug)
app.get("/rings/:uri", async (c) => {
    const rawUri = c.req.param("uri");
    if (!rawUri) return c.json({ error: "Missing ring URI" }, 400);

    const decodedUri = decodeURIComponent(rawUri);

    // Fetch ring info by URI or slug (DB はキャッシュ。なければ PDS から取り込む)
    let ring = decodedUri.startsWith("at://")
        ? await findRing(c.env.DB, { uri: decodedUri })
        : await findRing(c.env.DB, { slug: decodedUri });
    if (!ring) return c.json({ error: "Ring not found" }, 404);

    // メンバーは PDS (Constellation) から。取れなければ DB のキャッシュ
    const { members, ring: pdsRing } = await getApprovedMembers(
        c.env.DB,
        ring.uri,
    );
    if (pdsRing) ring = await refreshRingCache(c.env.DB, ring, pdsRing);

    const memberList = members.map((m) => ({
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
