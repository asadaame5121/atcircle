import { beforeEach, describe, expect, it, mock } from "bun:test";
import navigationApp from "./navigation";
import { Bindings } from "../types/bindings";

// --- D1 Mock Helpers ---
const createMockDB = (data: any = {}) => {
    return {
        prepare: mock((query: string) => {
            // Simple mock: if query contains "RANDOM", use randomData, etc.
            // But better to just let the test set up the return value manually on the spy if possible
            // or provide a flexible mock object.

            return {
                bind: mock((...args: any[]) => {
                    return {
                        first: mock(async () => data.first),
                        all: mock(async () => ({ results: data.all || [] })),
                        run: mock(async () => ({ success: true })),
                    };
                }),
                first: mock(async () => data.first),
                all: mock(async () => ({ results: data.all || [] })),
            };
        }),
    };
};

describe("Navigation Routes", () => {
    let env: Bindings;
    let mockPrepare: any;

    beforeEach(() => {
        // Reset env before each test
        const db = createMockDB();
        mockPrepare = db.prepare;
        env = { DB: db } as unknown as Bindings;
    });

    describe("GET /random", () => {
        it("redirects to a random site", async () => {
            // Setup
            env.DB = createMockDB({
                first: { url: "https://example.com" },
            }) as any;

            const res = await navigationApp.request("/random", {}, env);
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("https://example.com");
        });

        it("returns 404 if no sites found", async () => {
            env.DB = createMockDB({ first: null }) as any;

            const res = await navigationApp.request("/random", {}, env);
            expect(res.status).toBe(404);
            expect(await res.text()).toContain("No active sites");
        });
    });

    describe("GET /widget.js", () => {
        it("returns javascript content", async () => {
            const res = await navigationApp.request(
                "http://localhost/widget.js",
                {},
                env,
            );
            expect(res.status).toBe(200);
            expect(res.headers.get("Content-Type")).toContain(
                "application/javascript",
            );
            const text = await res.text();
            expect(text).toContain("class WebringNav extends HTMLElement");
        });
    });

    describe("GET /next", () => {
        const sites = [
            { id: 1, url: "https://site-a.com" },
            { id: 2, url: "https://site-b.com" },
            { id: 3, url: "https://site-c.com" },
        ];

        beforeEach(() => {
            env.DB = createMockDB({ all: sites }) as any;
        });

        it("redirects to next site in order", async () => {
            // From Site A (id 1) -> Should go to Site B (id 2)
            const res = await navigationApp.request(
                "/next?from=https://site-a.com",
                {},
                env,
            );
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("https://site-b.com");
        });

        it("loops back to first site from last", async () => {
            // From Site C (id 3) -> Should go to Site A (id 1)
            const res = await navigationApp.request(
                "/next?from=https://site-c.com",
                {},
                env,
            );
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("https://site-a.com");
        });

        it("redirects to random (fallback) if ?from is missing", async () => {
            const res = await navigationApp.request("/next", {}, env);
            // In the code: if (!from) return c.redirect("/nav/random");
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("/nav/random");
        });

        it("handles unknown 'from' url by starting at beginning (or fallback logic)", async () => {
            // currentIndex = -1 -> nextIndex = 0 -> Site A
            const res = await navigationApp.request(
                "/next?from=https://unknown.com",
                {},
                env,
            );
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("https://site-a.com");
        });
    });

    describe("GET /prev", () => {
        const sites = [
            { id: 1, url: "https://site-a.com" },
            { id: 2, url: "https://site-b.com" },
            { id: 3, url: "https://site-c.com" },
        ];

        beforeEach(() => {
            env.DB = createMockDB({ all: sites }) as any;
        });

        it("redirects to prev site in order", async () => {
            // From Site B (id 2) -> Should go to Site A (id 1)
            const res = await navigationApp.request(
                "/prev?from=https://site-b.com",
                {},
                env,
            );
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("https://site-a.com");
        });

        it("loops back to last site from first", async () => {
            // From Site A (id 1) -> Should go to Site C (id 3)
            const res = await navigationApp.request(
                "/prev?from=https://site-a.com",
                {},
                env,
            );
            expect(res.status).toBe(302);
            expect(res.headers.get("Location")).toBe("https://site-c.com");
        });
    });
});
