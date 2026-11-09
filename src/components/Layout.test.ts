import { describe, expect, it } from "vitest";
import ja from "../locales/ja.json";
import { Layout } from "./Layout.js";

const t = (key: string) => {
    const value = key
        .split(".")
        .reduce<any>((acc, part) => (acc ? acc[part] : undefined), ja);
    return typeof value === "string" ? value : key;
};

const render = async (props: Partial<Parameters<typeof Layout>[0]> = {}) =>
    String(
        await Layout({
            title: "テスト",
            t,
            lang: "ja",
            children: "<p>本文</p>",
            ...props,
        }),
    );

describe("Layout（90年代後半風デザイン）", () => {
    it("Kosugi Maru と DotGothic16 を読み込む", async () => {
        const html = await render();
        expect(html).toContain("fonts.googleapis.com/css2?family=DotGothic16");
        expect(html).toContain("family=Kosugi+Maru");
    });

    it("ロゴはトップへのリンクで、DotGothic16 用のクラスを持つ", async () => {
        const html = await render();
        expect(html).toMatch(
            /<a href="\/" class="rt-logo[^"]*"[^>]*>AT CIRCLE<\/a>/,
        );
    });

    it("ログイン後のナビに主要ページが並び、現在地に aria-current が付く", async () => {
        const html = await render({ current: "dashboard" });
        for (const href of ["/rings", "/antenna", "/dashboard", "/help"]) {
            expect(html).toContain(`href="${href}"`);
        }
        expect(html).toMatch(
            /<a href="\/dashboard" aria-current="page"[^>]*>\[ ダッシュボード \]<\/a>/,
        );
        expect(html).not.toMatch(/<a href="\/rings" aria-current/);
    });

    it("ゲスト用ナビは「ログインせずにリングを見る」だけを出す", async () => {
        const html = await render({ guest: true });
        const nav = html.match(
            /<nav aria-label="[^"]*" class="rt-nav">([\s\S]*?)<\/nav>/,
        );
        expect(nav).not.toBeNull();
        expect(nav?.[1]).toContain("[ ログインせずにリングを見る ]");
        expect(nav?.[1]).not.toContain('href="/dashboard"');
    });

    it("フッターに Simple Analytics バッジ（Outline）を置く", async () => {
        const html = await render();
        expect(html).toContain(
            'href="https://www.simpleanalytics.com?utm_source=at-circle.asadaame5121.net&amp;utm_content=badge"',
        );
        expect(html).toContain('referrerpolicy="origin"');
        expect(html).toContain(
            'src="https://simpleanalyticsbadges.com/at-circle.asadaame5121.net?background=transparent&amp;text=677779&amp;logo=677779&amp;border=677779&amp;radius=3&amp;border-width=1&amp;counter=false"',
        );
        expect(html).toMatch(
            /<img[^>]*alt="Simple Analytics"[^>]*loading="lazy"/,
        );
        expect(html).toContain('referrerpolicy="no-referrer"');
        expect(html).toContain('crossorigin="anonymous"');
    });

    it("フッターに規約・プライバシー・問い合わせのリンクがある", async () => {
        const html = await render();
        expect(html).toContain('href="/terms"');
        expect(html).toContain('href="/privacy"');
        expect(html).toContain(
            "https://bsky.app/profile/asadaame5121.bsky.social",
        );
    });
});
