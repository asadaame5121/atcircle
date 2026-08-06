import type { Context, Next } from "hono";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_ENTRIES = 10_000;

interface RateEntry {
    count: number;
    resetAt: number;
}

const hits = new Map<string, RateEntry>();

export const authRateLimiter = async (c: Context, next: Next) => {
    const key =
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        c.req.header("x-real-ip") ||
        "unknown";

    const now = Date.now();

    if (hits.size > MAX_ENTRIES) {
        for (const [k, v] of hits) {
            if (v.resetAt <= now) hits.delete(k);
        }
    }

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
        await next();
        return;
    }

    if (entry.count >= MAX_REQUESTS) {
        c.header(
            "Retry-After",
            String(Math.ceil((entry.resetAt - now) / 1000)),
        );
        return c.text("Too Many Requests", 429);
    }

    entry.count += 1;
    await next();
};
