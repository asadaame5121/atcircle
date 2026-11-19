import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import legalApp from "./legal.js";

describe("Legal Routes", () => {
    it("renders terms of service", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(legalApp);
        const res = await app.request("/terms", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Terms");
    });

    it("renders privacy policy", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(legalApp);
        const res = await app.request("/privacy", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Privacy");
    });

    describe.each([
        {
            lang: "ja",
            expected: [
                // ハンドル候補の表示（ブラウザから Bluesky 公開APIへ直接送信）
                "public.api.bsky.app",
                "app.bsky.actor.searchActorsTypeahead",
                "2文字以上",
                // フッターの Simple Analytics バッジ
                "simpleanalyticsbadges.com",
                // リング参加・申請・作成時に PDS へ書き込むレコード
                "PDS",
                "RSS",
                // 他の外部送信（実装で確認できたもの）
                "fonts.googleapis.com",
                "plc.directory",
                // 保存とクッキー
                "クッキー",
                "localStorage",
                // 改定日
                "最終改定日：2026年11月",
                // 承認時の公式アカウントからのメンション通知
                "@atcircle.bsky.social",
                "メンション",
            ],
            // 巡回ページも独自CSSに移行したので CDN のスタイルシートは読み込まない
            notExpected: [
                "フォロー",
                "cdn.jsdelivr.net",
                "cdnjs.cloudflare.com",
            ],
        },
        {
            lang: "en",
            expected: [
                "public.api.bsky.app",
                "app.bsky.actor.searchActorsTypeahead",
                "two or more characters",
                "simpleanalyticsbadges.com",
                "PDS",
                "RSS",
                "fonts.googleapis.com",
                "plc.directory",
                "cookie",
                "localStorage",
                "Last revised: November 2026",
                "@atcircle.bsky.social",
                "mention",
            ],
            // 実装されていない機能（フォロー一覧の取得）は書かない
            notExpected: ["follow", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
        },
    ])("privacy policy content ($lang)", ({ lang, expected, notExpected }) => {
        const fetchPrivacy = async () => {
            const env = { DB: createMockDB() };
            const app = wrapApp(legalApp);
            const res = await app.request(`/privacy?lang=${lang}`, {}, env);
            expect(res.status).toBe(200);
            const text = await res.text();
            // 本文（article）部分だけを対象にする
            const start = text.indexOf('<article class="rt-prose">');
            const end = text.indexOf("</article>", start);
            return text.slice(start, end);
        };

        it.each(expected)("mentions %s", async (phrase) => {
            expect(await fetchPrivacy()).toContain(phrase);
        });

        it.each(notExpected)("does not mention %s", async (phrase) => {
            expect((await fetchPrivacy()).toLowerCase()).not.toContain(
                phrase.toLowerCase(),
            );
        });
    });
});
