import { afterAll, describe, expect, it, vi } from "vitest";
import { fetchAndParseFeed } from "./feed";

describe("fetchAndParseFeed", () => {
    const originalFetch = global.fetch;

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it("should fetch and parse a valid RSS feed", async () => {
        const mockXml = `
            <?xml version="1.0" encoding="UTF-8" ?>
            <rss version="2.0">
            <channel>
                <title>Test Feed</title>
                <description>This is a test feed</description>
                <item>
                    <title>Test Item 1</title>
                    <link>https://example.com/1</link>
                    <pubDate>Mon, 25 Dec 2023 12:00:00 GMT</pubDate>
                    <description>Content of item 1</description>
                </item>
            </channel>
            </rss>
        `;

        global.fetch = vi.fn().mockImplementation(async () => {
            return new Response(mockXml, { status: 200 });
        });

        const feed = await fetchAndParseFeed("https://example.com/feed.xml");

        expect(feed).toBeDefined();
        expect(feed.title).toBe("Test Feed");
        expect(feed.description).toBe("This is a test feed");
        expect(feed.items).toHaveLength(1);
        expect(feed.items[0].title).toBe("Test Item 1");
        expect(feed.items[0].link).toBe("https://example.com/1");
    });

    it("should throw an error if fetch fails", async () => {
        global.fetch = vi.fn().mockImplementation(async () => {
            return new Response("Not Found", {
                status: 404,
                statusText: "Not Found",
            });
        });

        try {
            await fetchAndParseFeed("https://example.com/404");
            // Should not reach here
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e.message).toContain("Failed to fetch feed");
            expect(e.message).toContain("404");
        }
    });
});
