/**
 * Mock data generator for testing Antenna and OPML features.
 * This can be called from a hidden route or manually run.
 */
import { Bindings } from "../types/bindings.js";

export async function injectMockData(db: Bindings["DB"], ringUri: string) {
    console.log(`Injecting mock data for ring: ${ringUri}`);

    const mocks = [
        {
            title: "Bluesky Blog",
            url: "https://bsky.social/about/blog",
            rss_url: "https://bsky.social/about/blog/rss.xml",
            description: "Official news from the Bluesky team.",
        },
        {
            title: "Lume Documentation",
            url: "https://lume.land",
            rss_url: "https://lume.land/feed.xml",
            description: "The static site generator for Deno.",
        },
        {
            title: "IndieWeb News",
            url: "https://indieweb.org",
            rss_url: "https://indieweb.org/en/News?action=rss",
            description: "News from the IndieWeb community.",
        },
    ];

    for (const mock of mocks) {
        // 1. Create site
        const siteResult = await db.prepare(
            "INSERT INTO sites (user_did, url, title, description, rss_url) VALUES (?, ?, ?, ?, ?) RETURNING id",
        ).bind(
            "did:plc:mock-user",
            mock.url,
            mock.title,
            mock.description,
            mock.rss_url,
        ).first<any>();

        const siteId = siteResult.id;

        // 2. Create membership
        await db.prepare(
            "INSERT OR IGNORE INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)",
        ).bind(
            ringUri,
            siteId,
            `at://did:plc:mock-user/net.asadaame5121.at-circle.member/mock-${siteId}`,
        ).run();

        // 3. Add antenna items (simulating feed update)
        const now = Math.floor(Date.now() / 1000);
        await db.prepare(
            "INSERT INTO antenna_items (site_id, title, url, published_at) VALUES (?, ?, ?, ?)",
        ).bind(
            siteId,
            `Recent update from ${mock.title}`,
            `${mock.url}/post-${now}`,
            now,
        ).run();
    }

    console.log("Mock data injection complete.");
}
