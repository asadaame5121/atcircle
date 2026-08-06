import { describe, expect, it, vi } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";

// Mock the OAuth client to avoid real ATProto calls
vi.mock("../services/oauth.js", () => ({
    createClient: vi.fn().mockResolvedValue({
        authorize: vi
            .fn()
            .mockResolvedValue(
                new URL("https://bsky.social/oauth/authorize?test=1"),
            ),
        callback: vi.fn().mockResolvedValue({
            session: { did: "did:plc:mock", handle: "mock.bsky.social" },
        }),
        clientMetadata: { client_id: "test" },
    }),
    restoreAgent: vi.fn().mockResolvedValue(undefined),
}));

import authApp from "./auth.js";

describe("Auth Routes", () => {
    describe("GET /login — Open Redirect Prevention", () => {
        it("sanitizes //evil.com to /dashboard in hidden input", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request("/login?next=//evil.com", {}, env);
            expect(res.status).toBe(200);
            const html = await res.text();
            // The hidden input should contain /dashboard, not //evil.com
            expect(html).not.toContain('value="//evil.com"');
            expect(html).toContain('value="/dashboard"');
        });

        it("sanitizes /\\evil.com to /dashboard in hidden input", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request("/login?next=/\\evil.com", {}, env);
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(html).not.toContain('value="/\\evil.com"');
            expect(html).toContain('value="/dashboard"');
        });

        it("sanitizes absolute URL (https://evil.com) to /dashboard", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request(
                "/login?next=https://evil.com",
                {},
                env,
            );
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(html).not.toContain("evil.com");
            expect(html).toContain('value="/dashboard"');
        });

        it("allows a valid relative path like /dashboard/settings", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request(
                "/login?next=/dashboard/settings",
                {},
                env,
            );
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(html).toContain('value="/dashboard/settings"');
        });

        it("defaults to /dashboard when next is not provided", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request("/login", {}, env);
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(html).toContain('value="/dashboard"');
        });

        it("escapes HTML special characters in next parameter", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request(
                '/login?next=/page?q="test"',
                {},
                env,
            );
            expect(res.status).toBe(200);
            const html = await res.text();
            // Double quotes should be escaped in the HTML attribute
            expect(html).not.toContain('value="/page?q="test""');
        });
    });

    describe("POST /auth/login — Zod Schema Validation", () => {
        it("rejects external URL in next field with 400", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const form = new URLSearchParams();
            form.append("handle", "user.bsky.social");
            form.append("next", "https://evil.com");

            const res = await app.request(
                "/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-forwarded-for": "10.200.1.1",
                    },
                    body: form.toString(),
                },
                env,
            );

            // zod validation should fail because "https://evil.com" doesn't match /^\/[^/]/
            expect(res.status).toBe(400);
        });

        it("rejects //evil.com in next field with 400", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const form = new URLSearchParams();
            form.append("handle", "user.bsky.social");
            form.append("next", "//evil.com");

            const res = await app.request(
                "/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-forwarded-for": "10.200.1.2",
                    },
                    body: form.toString(),
                },
                env,
            );

            expect(res.status).toBe(400);
        });

        it("accepts a valid relative next path", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const form = new URLSearchParams();
            form.append("handle", "user.bsky.social");
            form.append("next", "/dashboard");

            const res = await app.request(
                "/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-forwarded-for": "10.200.1.3",
                    },
                    body: form.toString(),
                },
                env,
            );

            // Should redirect to OAuth provider (302)
            expect(res.status).toBe(302);
        });

        it("accepts empty next parameter", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const form = new URLSearchParams();
            form.append("handle", "user.bsky.social");
            form.append("next", "");

            const res = await app.request(
                "/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-forwarded-for": "10.200.1.4",
                    },
                    body: form.toString(),
                },
                env,
            );

            // Should redirect to OAuth provider (302)
            expect(res.status).toBe(302);
        });
    });

    describe("POST /auth/debug — Dev Auth Bypass Gate", () => {
        it("returns 403 when DEV_AUTH_BYPASS is not enabled (default)", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const form = new URLSearchParams();
            form.append("did", "did:plc:mock-user");
            form.append("handle", "debug-user.bsky.social");

            const res = await app.request(
                "/auth/debug",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-forwarded-for": "10.200.2.1",
                    },
                    body: form.toString(),
                },
                env,
            );

            expect(res.status).toBe(403);
            const text = await res.text();
            expect(text).toContain("Forbidden");
        });
    });

    describe("GET /logout", () => {
        it("redirects to home and clears session cookie", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request("/logout", {}, env);
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("/");
            // Should set session cookie to empty with maxAge 0
            const setCookie = res.headers.get("Set-Cookie");
            expect(setCookie).not.toBeNull();
        });
    });

    describe("POST /logout", () => {
        it("redirects to home and clears session cookie", async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(authApp);
            const res = await app.request(
                "/logout",
                {
                    method: "POST",
                },
                env,
            );
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("/");
        });
    });
});
