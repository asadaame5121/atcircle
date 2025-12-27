import Parser from "rss-parser";

/**
 * Custom type for the expected feed item structure.
 * We prioritize content that is useful for the Antenna feature.
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
 * Utilizes the global `fetch` API which is compatible with Cloudflare Workers,
 * and uses `rss-parser` to parse the XML content.
 */
export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
    const parser = new Parser({
        // Customizing fields is optional but good for type safety if needed.
        // For now, default behavior is usually sufficient for standard RSS/Atom.
    });

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Webring-Antenna/1.0 (Cloudflare Workers)",
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
