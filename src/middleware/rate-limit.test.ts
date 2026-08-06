import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { authRateLimiter } from "./rate-limit.js";

describe("Rate Limiter Middleware", () => {
    // Use a unique IP per test to avoid cross-test pollution from the module-level Map
    const uniqueIP = () =>
        `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    it("allows requests under the limit (10 per minute)", async () => {
        const ip = uniqueIP();
        const app = new Hono();
        app.use("*", authRateLimiter);
        app.get("/", (c) => c.text("OK"));

        for (let i = 0; i < 10; i++) {
            const res = await app.request("/", {
                headers: { "x-forwarded-for": ip },
            });
            expect(res.status).toBe(200);
        }
    });

    it("returns 429 on the 11th request within the window", async () => {
        const ip = uniqueIP();
        const app = new Hono();
        app.use("*", authRateLimiter);
        app.get("/", (c) => c.text("OK"));

        // First 10 should pass
        for (let i = 0; i < 10; i++) {
            const res = await app.request("/", {
                headers: { "x-forwarded-for": ip },
            });
            expect(res.status).toBe(200);
        }

        // 11th should be rate limited
        const res = await app.request("/", {
            headers: { "x-forwarded-for": ip },
        });
        expect(res.status).toBe(429);
        expect(await res.text()).toBe("Too Many Requests");
    });

    it("includes Retry-After header on 429 response", async () => {
        const ip = uniqueIP();
        const app = new Hono();
        app.use("*", authRateLimiter);
        app.get("/", (c) => c.text("OK"));

        for (let i = 0; i < 10; i++) {
            await app.request("/", {
                headers: { "x-forwarded-for": ip },
            });
        }

        const res = await app.request("/", {
            headers: { "x-forwarded-for": ip },
        });
        expect(res.status).toBe(429);
        const retryAfter = res.headers.get("Retry-After");
        expect(retryAfter).not.toBeNull();
        const retrySeconds = Number(retryAfter);
        expect(retrySeconds).toBeGreaterThan(0);
        expect(retrySeconds).toBeLessThanOrEqual(60);
    });

    it("uses x-real-ip as fallback when x-forwarded-for is absent", async () => {
        const ip = uniqueIP();
        const app = new Hono();
        app.use("*", authRateLimiter);
        app.get("/", (c) => c.text("OK"));

        for (let i = 0; i < 10; i++) {
            const res = await app.request("/", {
                headers: { "x-real-ip": ip },
            });
            expect(res.status).toBe(200);
        }

        const res = await app.request("/", {
            headers: { "x-real-ip": ip },
        });
        expect(res.status).toBe(429);
    });

    it("tracks different IPs independently", async () => {
        const ip1 = uniqueIP();
        const ip2 = uniqueIP();
        const app = new Hono();
        app.use("*", authRateLimiter);
        app.get("/", (c) => c.text("OK"));

        // Exhaust ip1
        for (let i = 0; i < 10; i++) {
            await app.request("/", {
                headers: { "x-forwarded-for": ip1 },
            });
        }

        // ip1 should be limited
        const res1 = await app.request("/", {
            headers: { "x-forwarded-for": ip1 },
        });
        expect(res1.status).toBe(429);

        // ip2 should still be allowed
        const res2 = await app.request("/", {
            headers: { "x-forwarded-for": ip2 },
        });
        expect(res2.status).toBe(200);
    });

    it("uses the first IP from x-forwarded-for when multiple are present", async () => {
        const ip = uniqueIP();
        const app = new Hono();
        app.use("*", authRateLimiter);
        app.get("/", (c) => c.text("OK"));

        for (let i = 0; i < 10; i++) {
            const res = await app.request("/", {
                headers: { "x-forwarded-for": `${ip}, 192.168.1.1, 10.0.0.1` },
            });
            expect(res.status).toBe(200);
        }

        // Same first IP should be limited
        const res = await app.request("/", {
            headers: { "x-forwarded-for": `${ip}, 192.168.1.1` },
        });
        expect(res.status).toBe(429);
    });
});
