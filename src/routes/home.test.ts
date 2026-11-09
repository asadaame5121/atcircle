import { describe, expect, it, vi } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";

vi.mock("../../services/atproto.js", () => ({
    AtProtoService: {
        getProfilesPublic: vi.fn(async () => ({ profiles: [] })),
    },
}));

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
