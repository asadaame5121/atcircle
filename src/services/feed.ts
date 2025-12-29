import Parser from "rss-parser";
import type { Bindings } from "../types/bindings.js";

/**
 * Custom type for the expected feed item structure.
 */
export interface FeedItem {
    title?: string;
    link?: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    isoDate?: string;
}

export interface ParsedFeed {
    title?: string;
    description?: string;
    items: FeedItem[];
}

/**
 * Fetches and parses an RSS/Atom feed.
 */
export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
    const parser = new Parser();

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Webring-Antenna/1.0 (Node.js)",
            },
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch feed: ${response.status} ${response.statusText}`,
            );
        }

        const xml = await response.text();
        const feed = await parser.parseString(xml);

        return {
            title: feed.title,
            description: feed.description,
            items: feed.items.map((item) => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                content: item.content,
                contentSnippet: item.contentSnippet,
                isoDate: item.isoDate,
            })),
        };
    } catch (error) {
        console.error(`Error parsing feed at ${url}:`, error);
        throw error;
    }
}

/**
 * Iterates through all active sites with RSS URLs and updates the antenna_items table.
 */
let lastUpdateAt = 0;
const MIN_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function updateAllFeeds(db: Bindings["DB"], force = false) {
    const now = Date.now();
    if (!force && now - lastUpdateAt < MIN_UPDATE_INTERVAL) {
        console.log("[Antenna] Skipping update: Too frequent.");
        return {
            skipped: true,
            nextPossibleAt: new Date(
                lastUpdateAt + MIN_UPDATE_INTERVAL,
            ).toLocaleTimeString(),
        };
    }
    lastUpdateAt = now;

    console.log("[Antenna] Starting global feed update...");
    try {
        const sites = await db
            .prepare(
                "SELECT * FROM sites WHERE rss_url IS NOT NULL AND is_active = 1",
            )
            .all();
        if (!sites.results) return { success: true, added: 0 };

        let totalAdded = 0;
        for (const site of sites.results as any[]) {
            console.log(
                `[Antenna] Processing: ${site.title} (${site.rss_url})`,
            );
            try {
                const feed = await fetchAndParseFeed(site.rss_url);
                const recentItems = feed.items.slice(0, 10); // Check last 10 items

                for (const item of recentItems) {
                    if (!item.link || !item.title) continue;

                    // Check for duplicates
                    const exists = await db
                        .prepare("SELECT 1 FROM antenna_items WHERE url = ?")
                        .bind(item.link)
                        .first();

                    if (!exists) {
                        const publishedAt = item.isoDate
                            ? Math.floor(
                                  new Date(item.isoDate).getTime() / 1000,
                              )
                            : Math.floor(Date.now() / 1000);

                        await db
                            .prepare(
                                "INSERT INTO antenna_items (site_id, title, url, published_at) VALUES (?, ?, ?, ?)",
                            )
                            .bind(site.id, item.title, item.link, publishedAt)
                            .run();

                        totalAdded++;
                        console.log(`[Antenna] Added: ${item.title}`);
                    }
                }
            } catch (e) {
                console.error(`[Antenna] Error for site ${site.id}:`, e);
            }
        }
        console.log(
            `[Antenna] Update complete. Added ${totalAdded} total items.`,
        );
        return { success: true, added: totalAdded };
    } catch (e) {
        console.error("[Antenna] Failed to update feeds:", e);
        throw e;
    }
}
