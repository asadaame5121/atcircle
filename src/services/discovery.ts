import * as cheerio from "cheerio";
import { logger as pinoLogger } from "../lib/logger.js";

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
        pinoLogger.error({ msg: "Discovery failed", url, error: e });
        return null;
    }
}

/**
 * Verifies if the webring widget is present on the given page.
 * @param url - The URL to check.
 * @param ringUri - (Optional) The ring URI to look for in links.
 * @returns true if widget is detected, false otherwise.
 */
export async function verifyWidget(
    url: string,
    ringUri?: string,
): Promise<boolean> {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Webring-Verify/1.0",
            },
            signal: AbortSignal.timeout(10000), // 10s timeout
        });
        if (!res.ok) return false;
        const html = await res.text();
        const $ = cheerio.load(html);

        // 1. Check for Web Component
        if ($("webring-nav").length > 0) return true;

        // 2. Check for No-JS widget by ID
        if ($("#atcircle").length > 0) return true;

        // 3. Check for links containing the ring URI
        if (ringUri) {
            const encodedRing = encodeURIComponent(ringUri);
            const patterns = ["/p?", "/n?", "/r?", `ring=${encodedRing}`];

            let found = false;
            $("a").each((_, el) => {
                const href = $(el).attr("href");
                if (href) {
                    if (patterns.some((p) => href.includes(p))) {
                        found = true;
                        return false; // break
                    }
                }
            });
            if (found) return true;
        }

        return false;
    } catch (e) {
        pinoLogger.error({ msg: "Widget verification failed", url, error: e });
        return false;
    }
}
