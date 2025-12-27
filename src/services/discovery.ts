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
 * Discovers metadata (Title, RSS/Atom feeds) in HTML content using HTMLRewriter.
 * @param baseUrl - The base URL of the site.
 * @param html - The HTML content of the page.
 * @returns SiteMetadata object.
 */
export function discoverMetadata(baseUrl: string, html: string): SiteMetadata {
    const feeds: DiscoveredFeed[] = [];
    let title: string | undefined;

    // In actual Cloudflare Workers or Bun, HTMLRewriter is a global or importable.
    const rewriter = new HTMLRewriter();

    // Feed Discovery
    rewriter.on(
        'link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]',
        {
            element(element) {
                const href = element.getAttribute("href");
                const type = element.getAttribute("type");
                if (href && type) {
                    try {
                        const absUrl = new URL(href, baseUrl).toString();
                        feeds.push({ url: absUrl, type });
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                }
            },
        },
    );

    // Title Discovery
    rewriter.on("title", {
        text(text) {
            if (!title && text.text.trim().length > 0) {
                title = text.text.trim();
            }
        },
    });

    try {
        rewriter.transform(new Response(html));
    } catch (e) {
        // Fallback or ignore if rewriter fails
        console.error("HTMLRewriter transform failed", e);
    }

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
