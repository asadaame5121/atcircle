import { describe, expect, it } from "vitest";
import { createMockDB } from "../../tests/route-utils.js";
import app from "../app.js";

describe("Companion Navigation & PWA Integration Tests", () => {
    it("redirects /rings/companion to /rings when ring is missing", async () => {
        const env = { DB: createMockDB({}) };
        const res = await app.request("/rings/companion", {}, env as any);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/rings");
    });

    it("renders CompanionView when ring is found by uri", async () => {
        const env = {
            DB: createMockDB({
                first: {
                    id: 1,
                    title: "Indie Webring",
                    uri: "at://indie-ring",
                },
                all: [
                    {
                        id: 10,
                        title: "Member Blog",
                        url: "https://blog.example.com",
                        member_uri: "at://did:plc:user1/member/1",
                        description: "A cool blog",
                    },
                ],
            }),
        };

        const res = await app.request(
            `/rings/companion?ring=${encodeURIComponent("at://indie-ring")}`,
            {},
            env as any,
        );
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("Indie Webring");
        expect(html).toContain("Companion");
        expect(html).toContain("Member Blog");
        expect(html).toContain("btn-visit");
        expect(html).toContain("btn-prev");
        expect(html).toContain("btn-next");
        expect(html).toContain("btn-random");
        expect(html).toContain("chk-auto-open");
    });

    it("renders CompanionView when ring is found by slug", async () => {
        const env = {
            DB: createMockDB({
                first: {
                    id: 1,
                    title: "Indie Webring",
                    uri: "at://indie-ring",
                    slug: "indie",
                },
                all: [
                    {
                        id: 10,
                        title: "Member Blog",
                        url: "https://blog.example.com",
                        member_uri: "at://did:plc:user1/member/1",
                    },
                ],
            }),
        };

        const res = await app.request(
            "/rings/companion?slug=indie",
            {},
            env as any,
        );
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("Indie Webring");
    });

    it("redirects /r/:slug/companion to /rings/companion?ring=...", async () => {
        const env = {
            DB: createMockDB({
                first: { uri: "at://indie-ring", slug: "indie" },
            }),
        };

        const res = await app.request("/r/indie/companion", {}, env as any);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain(
            "/rings/companion?ring=at%3A%2F%2Findie-ring",
        );
    });

    it("renders RingDetailView with touring controller and companion trigger buttons", async () => {
        const env = {
            DB: createMockDB({
                first: {
                    id: 1,
                    title: "Indie Webring",
                    uri: "at://indie-ring",
                },
                all: [
                    {
                        id: 10,
                        title: "Member Blog",
                        url: "https://blog.example.com",
                        member_uri: "at://did:plc:user1/member/1",
                        description: "A cool blog",
                    },
                ],
            }),
        };

        const res = await app.request(
            `/rings/view?ring=${encodeURIComponent("at://indie-ring")}`,
            {},
            env as any,
        );
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("Indie Webring");
        expect(html).toContain("btn-open-companion-win");
        expect(html).toContain("tour-btn-visit");
        expect(html).toContain("tour-btn-next");
        expect(html).toContain("tour-btn-prev");
        expect(html).toContain("tour-btn-random");
    });

    it("serves PWA manifest and service worker directly", async () => {
        const env = { DB: createMockDB({}) };

        const manifestRes = await app.request(
            "/manifest.webmanifest",
            {},
            env as any,
        );
        expect(manifestRes.status).toBe(200);
        const manifestText = await manifestRes.text();
        expect(manifestText).toContain("AT CIRCLE Companion");

        const swRes = await app.request("/sw.js", {}, env as any);
        expect(swRes.status).toBe(200);
        const swText = await swRes.text();
        expect(swText).toContain("atcircle-companion");
    });
});
