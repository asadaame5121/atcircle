import { describe, expect, it } from "vitest";
import { discoverMetadata } from "./discovery";

describe("Metadata Discovery (cheerio)", () => {
    it("finds title and RSS links", () => {
        const html = `
            <html>
                <head>
                    <link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml" />
                    <title>Test Site</title>
                </head>
                <body></body>
            </html>
        `;
        const meta = discoverMetadata("https://example.com", html);
        expect(meta.title).toBe("Test Site");
        expect(meta.feeds).toHaveLength(1);
        expect(meta.feeds[0].url).toBe("https://example.com/feed.xml");
    });

    it("resolves relative URLs", () => {
        const html = `
            <link rel="alternate" type="application/atom+xml" href="/atom.xml" />
        `;
        const meta = discoverMetadata("https://example.com/blog/post", html);
        expect(meta.feeds[0].url).toBe("https://example.com/atom.xml");
    });

    it("handles missing title", () => {
        const html = `<div>No title</div>`;
        const meta = discoverMetadata("https://example.com", html);
        expect(meta.title).toBeUndefined();
    });
});
