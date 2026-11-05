/**
 * HTML / URL helpers for rendering untrusted values.
 *
 * Site titles, URLs and feed items come from other users' records and from
 * arbitrary RSS feeds, so they must never reach the DOM unescaped and only
 * http(s) URLs may be used as link targets.
 */

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

/** Escape a value for use in HTML text or a quoted attribute. */
export const escapeHtml = (value: unknown): string =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/** True when `value` parses as an absolute http: or https: URL. */
export const isHttpUrl = (value: unknown): value is string => {
    if (typeof value !== "string" || value.length === 0) return false;
    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
};

/**
 * Returns the URL when it is http(s), otherwise a harmless placeholder.
 * Use for every `href`/`src` built from user- or feed-supplied data so that
 * `javascript:` / `data:` URLs cannot be injected.
 */
export const safeHref = (value: unknown, fallback = "#"): string =>
    isHttpUrl(value) ? value : fallback;

/**
 * Serialize a value as a JavaScript literal that is safe to place inside an
 * inline `<script>` element. Plain `JSON.stringify` leaves `</script>` and
 * `<!--` intact, so attacker-controlled strings (site titles, query params)
 * could close the script element and inject markup.
 */
export const jsonForScript = (value: unknown): string =>
    (JSON.stringify(value) ?? "null")
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
