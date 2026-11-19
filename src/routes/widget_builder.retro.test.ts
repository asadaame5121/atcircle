import { describe, expect, it } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../tests/route-utils.js";
import widgetApp from "./widget_builder.js";

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";

const request = async (
    query: string,
    opts: { member: boolean; pending: boolean },
) => {
    const token = await createMockAuthToken("did:plc:me", "me.test");
    const db = createMockDB({
        first: (q: string) => {
            if (q.includes("FROM sites"))
                return { id: 1, url: "https://mine.example", title: "Mine" };
            if (q.includes("FROM rings"))
                return { uri: RING, title: "個人サイトの集い" };
            if (q.includes("FROM memberships"))
                return opts.member
                    ? { banner_url: null, member_uri: "at://m/1" }
                    : null;
            if (q.includes("FROM join_requests"))
                return opts.pending ? { 1: 1 } : null;
            return null;
        },
        all: [],
    });
    const res = await wrapApp(widgetApp).request(
        `/?ring_uri=${encodeURIComponent(RING)}${query}`,
        { headers: { Cookie: `session=${token}`, "Accept-Language": "ja" } },
        { DB: db },
    );
    return { res, html: await res.text() };
};

describe("ウィジェットを貼る画面", () => {
    it("参加済みならコードとコピーボタンを出し、HTML版をおすすめにする", async () => {
        const { res, html } = await request("", {
            member: true,
            pending: false,
        });
        expect(res.status).toBe(200);
        expect(html).toContain("■ ウィジェットを貼る ■");
        expect(html).toMatch(
            /<li aria-current="step"[^>]*>STEP3 ウィジェット<\/li>/,
        );
        expect(html).toMatch(
            /<button type="button" class="rt-bevel" data-format="html" aria-pressed="true">HTML（おすすめ）<\/button>/,
        );
        expect(html).toContain(
            'data-format="simple" aria-pressed="false">Web Components</button>',
        );
        expect(html).toContain('id="w-code"');
        expect(html).toContain("コードをコピー");
        expect(html).toContain("詳しい設定");
        // 埋め込みコード生成に使う値はスクリプトではなく data 属性で渡す
        expect(html).toContain(`data-ring-uri="${RING}"`);
        expect(html).toContain('data-site-url="https://mine.example"');
        expect(html).not.toContain("参加しました");
    });

    it("参加直後は参加したことを知らせる", async () => {
        const { html } = await request("&joined=1", {
            member: true,
            pending: false,
        });
        expect(html).toContain("★ 「個人サイトの集い」に参加しました ★");
    });

    it("承認待ちならコードを出さず、承認待ちの画面にする", async () => {
        const { res, html } = await request("&requested=1", {
            member: false,
            pending: true,
        });
        expect(res.status).toBe(200);
        expect(html).toContain("■ 承認待ち ■");
        expect(html).toContain("★ 「個人サイトの集い」に参加を申請しました ★");
        expect(html).toMatch(
            /<li aria-current="step"[^>]*>STEP2 承認待ち<\/li>/,
        );
        expect(html).toContain("オーナーが確認中");
        expect(html).not.toContain('id="w-code"');
        expect(html).not.toContain("/nav/widget.js");
        expect(html).toContain('href="/dashboard"');
    });
});
