import * as cheerio from "cheerio";

export interface DiscoveredFeed {
    url: string;
    type: string;
}

export interface SiteMetadata {
    url: string;
    title?: string;
    feeds: DiscoveredFeed[];
}

/**
 * Discovers metadata (Title, RSS/Atom feeds) in HTML content using cheerio.
 * @param baseUrl - The base URL of the site.
 * @param html - The HTML content of the page.
 * @returns SiteMetadata object.
 */
export function discoverMetadata(baseUrl: string, html: string): SiteMetadata {
    const feeds: DiscoveredFeed[] = [];

    const $ = cheerio.load(html);

    // Title Discovery
    const title = $("title").first().text().trim() || undefined;

    // Feed Discovery
    $('link[rel="alternate"]').each((_, el) => {
        const $el = $(el);
        const type = $el.attr("type");
        const href = $el.attr("href");

        if (
            href &&
            type &&
            (type === "application/rss+xml" || type === "application/atom+xml")
        ) {
            try {
                const absUrl = new URL(href, baseUrl).toString();
                feeds.push({ url: absUrl, type });
            } catch (_e) {
                // Ignore invalid URLs
            }
        }
    });

    return {
        url: baseUrl,
        title,
        feeds,
    };
}

/**
 * Helper to fetch and discover metadata from a URL.
 */
export async function fetchAndDiscoverMetadata(
    url: string,
): Promise<SiteMetadata | null> {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Webring-Discovery/1.0",
            },
        });
        if (!res.ok) return null;
        const html = await res.text();
        return discoverMetadata(url, html);
    } catch (e) {
        console.error("Discovery failed for", url, e);
        return null;
    }
}
