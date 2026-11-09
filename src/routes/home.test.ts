import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";

import homeApp from "./home.js";

describe("Home Route", () => {
    it("renders home page for guests", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(homeApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("AT CIRCLE");
        expect(text).toContain('action="/auth/login"');
        expect(text).toContain("/rings");
    });

    it("見出し・3ステップ・ログインフォームだけの1画面にする", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(homeApp);
        const res = await app.request(
            "/",
            { headers: { "Accept-Language": "ja" } },
            env,
        );
        const text = await res.text();
        expect(text).toContain("個人サイトを、<br>仲間の輪につなげる");
        expect(text).toContain("3ステップ");
        expect(text).toContain("<b>STEP1</b> ログイン");
        expect(text).toContain("<b>STEP2</b> リングに入る");
        expect(text).toContain("<b>STEP3</b> ウィジェットを貼る");
        expect(text).toContain('role="combobox"');
        // 旧トップの説明セクションは出さない
        expect(text).not.toContain("AT CIRCLE でできること");
    });

    it("ログイン前でも公開リングを人数の多い順に最大6件見せる", async () => {
        const rings = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            title: `Ring ${i}`,
            uri: `at://ring/${i}`,
            description: i === 7 ? "いちばん大きい" : "",
            acceptance_policy: i === 7 ? "manual" : "auto",
            member_count: i,
        }));
        const env = { DB: createMockDB({ all: rings }) };
        const app = wrapApp(homeApp);
        const res = await app.request(
            "/",
            { headers: { "Accept-Language": "ja" } },
            env,
        );
        const text = await res.text();
        expect(text).toContain("公開中のリング");
        expect(text.indexOf("Ring 7")).toBeLessThan(text.indexOf("Ring 6"));
        expect(text).toContain("Ring 2");
        expect(text).not.toContain("Ring 1<");
        expect(text).toContain('href="/rings/view?ring=at%3A%2F%2Fring%2F7"');
        expect(text).toContain("7人");
        expect(text).toContain("承認制");
        expect(text).toContain("いちばん大きい");
        expect(text).toContain('href="/rings"');
    });

    it("公開リングがなければ一覧の枠を出さない", async () => {
        const env = { DB: createMockDB({ all: [] }) };
        const app = wrapApp(homeApp);
        const res = await app.request(
            "/",
            { headers: { "Accept-Language": "ja" } },
            env,
        );
        const text = await res.text();
        expect(text).not.toContain("公開中のリング");
    });

    it("一覧の読み込みに失敗してもトップは表示する", async () => {
        const db = createMockDB();
        db.prepare = (() => {
            throw new Error("db down");
        }) as any;
        const app = wrapApp(homeApp);
        const res = await app.request("/", {}, { DB: db });
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('action="/auth/login"');
    });

    it("redirects to dashboard for logged in users", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(homeApp);
        const res = await app.request(
            "/",
            {
                headers: {
                    Cookie: "session=mock-token",
                },
            },
            env,
        );
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/dashboard");
    });
});
