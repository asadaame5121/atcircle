import type { Context, Next } from "hono";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 10;
const MAX_ENTRIES = 10_000;

interface RateEntry {
    count: number;
    resetAt: number;
}

const hits = new Map<string, RateEntry>();

/**
 * Best-effort client IP.
 *
 * On Fly.io the edge proxy sets `Fly-Client-IP`, which clients cannot spoof.
 * The first `X-Forwarded-For` entry is client-controlled, so when only XFF is
 * available we use its last entry (the one appended by the nearest proxy).
 */
export const clientIp = (c: Context): string => {
    const fly = c.req.header("fly-client-ip")?.trim();
    if (fly) return fly;
    const xff = c.req.header("x-forwarded-for");
    if (xff) {
        const parts = xff
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) return last;
    }
    return c.req.header("x-real-ip")?.trim() || "unknown";
};

export const authRateLimiter = async (c: Context, next: Next) => {
    const key = clientIp(c);

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
