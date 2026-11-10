import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import ringsApp from "./rings.js";

describe("Rings Route", () => {
    it("renders ring list", async () => {
        const env = {
            DB: createMockDB({
                all: [
                    {
                        id: 1,
                        title: "Test Ring",
                        uri: "at://test",
                        member_count: 5,
                    },
                ],
            }),
        };
        const app = wrapApp(ringsApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Test Ring");
    });

    it("renders ring detail view", async () => {
        const env = {
            DB: createMockDB({
                first: { id: 1, title: "Test Ring", uri: "at://test" },
                all: [{ title: "Member 1", url: "https://site1.com" }],
            }),
        };
        const app = wrapApp(ringsApp);
        const res = await app.request("/view?ring=at://test", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Test Ring");
        expect(text).toContain("Member 1");
    });

    it("renders companion view", async () => {
        const env = {
            DB: createMockDB({
                first: { id: 1, title: "Test Ring", uri: "at://test" },
                all: [
                    {
                        id: 1,
                        title: "Member 1",
                        url: "https://site1.com",
                        member_uri: "at://member1",
                    },
                ],
            }),
        };
        const app = wrapApp(ringsApp);
        const res = await app.request("/companion?ring=at://test", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Test Ring");
        expect(text).toContain("Companion");
    });

    it("exports OPML", async () => {
        const env = {
            DB: createMockDB({
                first: { title: "Test Ring" },
                all: [
                    {
                        title: "Member 1",
                        url: "https://site1.com",
                        rss_url: "https://site1.com/rss",
                    },
                ],
            }),
        };
        const res = await ringsApp.request("/opml?ring=at://test", {}, env);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/x-opml+xml");
        const body = await res.text();
        expect(body).toContain("<opml");
        expect(body).toContain('title="Member 1"');
    });
});

describe("リング詳細（90年代後半風）", () => {
    it("参加ボタンは「リングを探す」の参加欄へ、参加サイトは一覧で出す", async () => {
        const env = {
            DB: createMockDB({
                first: {
                    id: 1,
                    title: "Test Ring",
                    uri: "at://test",
                    description: "説明文",
                },
                all: [
                    {
                        title: "Member 1",
                        url: "https://site1.com",
                        member_uri: "at://m1",
                        rss_url: "https://site1.com/feed",
                    },
                ],
            }),
        };
        const app = wrapApp(ringsApp);
        const res = await app.request(
            "/view?ring=at://test",
            { headers: { "Accept-Language": "ja" } },
            env,
        );
        const text = await res.text();
        expect(text).toContain('class="rt-h1"');
        expect(text).toContain(
            `href="/rings?select=${encodeURIComponent("at://test")}#join"`,
        );
        expect(text).not.toContain("/dashboard?ring=");
        expect(text).toContain('class="rt-ring-list"');
        expect(text).toContain('href="https://site1.com/feed"');
        // 巡回パネルのスクリプトが使う要素は残す
        for (const id of [
            "main-tour-card",
            "tour-member-title",
            "tour-btn-prev",
            "tour-btn-next",
            "tour-btn-random",
            "tour-btn-visit",
            "btn-open-companion-win",
        ]) {
            expect(text).toContain(`id="${id}"`);
        }
    });
});
