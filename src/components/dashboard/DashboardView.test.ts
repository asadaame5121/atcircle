import { describe, expect, it } from "vitest";
import ja from "../../locales/ja.json";
import { DashboardView } from "./DashboardView.js";

const t = (key: string, options?: any) => {
    const value = key
        .split(".")
        .reduce<any>((acc, part) => (acc ? acc[part] : undefined), ja);
    if (typeof value !== "string") return key;
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        String(options?.[k] ?? ""),
    );
};

const OWN = "at://did:plc:me/net.asadaame5121.at-circle.ring/own";
const JOINED = "at://did:plc:x/net.asadaame5121.at-circle.ring/joined";
const REQUESTED = "at://did:plc:y/net.asadaame5121.at-circle.ring/req";

const base = {
    site: {
        title: "DropGarden",
        url: "https://asadaame5121.net",
        is_active: 1,
    },
    unifiedRings: [
        {
            uri: OWN,
            title: "個人サイトの集い",
            description: "個人サイトを愛するみなさん",
            isAdmin: true,
            isMember: true,
            memberUri: "at://did:plc:me/member/1",
            memberCount: 7,
            pendingCount: 2,
            status: "open",
            acceptancePolicy: "manual",
        },
        {
            uri: JOINED,
            title: "Obsidian",
            description: "",
            isAdmin: false,
            isMember: true,
            memberUri: "at://did:plc:me/member/2",
            memberCount: 3,
            pendingCount: 0,
        },
        {
            uri: REQUESTED,
            title: "読書ブログの輪",
            description: "本の感想",
            isAdmin: false,
            isMember: false,
            isPendingRequest: true,
            requestUri: "at://did:plc:me/request/1",
            memberCount: 5,
            pendingCount: 0,
        },
    ],
    joinRequests: [
        {
            id: 9,
            ring_uri: OWN,
            ring_title: "個人サイトの集い",
            site_title: "Newcomer",
            site_url: "https://new.example",
            user_did: "did:plc:new",
        },
    ],
    pendingMemberships: [],
    blocks: [],
    did: "did:plc:me",
    isAdmin: false,
    t,
};

const render = (props: Partial<typeof base> & { msg?: string } = {}) =>
    String(DashboardView({ ...base, ...props } as any));

describe("DashboardView（90年代後半風）", () => {
    it("見出しと主操作（探す＝黄色／立ち上げる）を出す", () => {
        const html = render();
        expect(html).toContain("■ ダッシュボード ■");
        expect(html).toMatch(
            /<a href="\/rings" class="rt-bevel rt-go">リングを探す<\/a>/,
        );
        expect(html).toMatch(
            /<a href="\/rings\/new" class="rt-bevel">リングを立ち上げる<\/a>/,
        );
        // 作成・参加は専用画面に移ったのでダイアログは出さない
        expect(html).not.toContain("create_ring_modal");
        expect(html).not.toContain("join_ring_modal");
    });

    it("自分のサイトを1行で見せ、設定へリンクする", () => {
        const html = render();
        expect(html).toContain("<b>DropGarden</b>");
        expect(html).toContain('href="https://asadaame5121.net"');
        expect(html).toContain(">有効<");
        expect(html).toContain('href="/dashboard/site/edit"');
    });

    it("参加中のリングを役割・人数つきで並べ、ウィジェットへのボタンを出す", () => {
        const html = render();
        expect(html).toContain("参加中のリング");
        expect(html).toContain("オーナー・7人");
        expect(html).toContain("参加者・3人");
        expect(html).toContain(
            `href="/dashboard/ring/widget?ring_uri=${encodeURIComponent(JOINED)}"`,
        );
    });

    it("オーナーのリングだけ、その他の操作に管理系を出す", () => {
        const html = render();
        expect(html).toContain('aria-label="個人サイトの集いのその他の操作"');
        expect(html).toContain("招待リンクをコピー");
        expect(html).toContain("メンバー管理");
        expect(html).toContain("リング設定");
        const obsidianMenu = html.slice(
            html.indexOf('aria-label="Obsidianのその他の操作"'),
            html.indexOf('aria-label="読書ブログの輪のその他の操作"'),
        );
        expect(obsidianMenu).not.toContain("メンバー管理");
        expect(obsidianMenu).toContain("リングから離脱");
    });

    it("参加申請が来ているリングには件数を出して申請一覧へ飛べる", () => {
        const html = render();
        expect(html).toContain('href="#requests"');
        expect(html).toContain("参加申請 2件");
        expect(html).toContain('id="requests"');
        expect(html).toContain('action="/dashboard/ring/request/approve"');
        expect(html).toContain("Newcomer");
    });

    it("自分が申請中のリングは承認待ちと出し、ウィジェットではなく取り消しを出す", () => {
        const html = render();
        const row = html.slice(html.indexOf("読書ブログの輪"));
        expect(row).toContain("承認待ち");
        expect(row).toContain("申請を取り消す");
        expect(row).toContain('value="at://did:plc:me/request/1"');
        expect(row).not.toContain(
            `/dashboard/ring/widget?ring_uri=${encodeURIComponent(REQUESTED)}`,
        );
    });

    it("参加中のリングがなければ探す画面へ誘導する", () => {
        const html = render({ unifiedRings: [], joinRequests: [] });
        expect(html).toContain("まだリングに参加していません");
    });

    it("処理結果のメッセージを出す", () => {
        expect(render({ msg: "updated" })).toContain("更新しました！");
        // 知らない値はそのまま出さない
        expect(render({ msg: "<b>x</b>" })).not.toContain('class="rt-flash"');
    });

    it("同期・ログアウト・退会は「その他」にまとめる", () => {
        const html = render();
        expect(html).toContain('action="/dashboard/sync"');
        expect(html).toContain('action="/logout"');
        expect(html).toContain("leave_modal");
    });
});

describe("ウィジェット未設置の表示", () => {
    it("確認済みで未設置の参加にだけ「ウィジェット未設置」を出す", () => {
        const html = String(
            DashboardView({
                ...base,
                widgetStatus: {
                    [OWN]: { checked: true, installed: false },
                    [JOINED]: { checked: true, installed: true },
                },
            } as any),
        );
        const own = html.slice(
            html.indexOf("個人サイトの集い"),
            html.indexOf('aria-label="個人サイトの集いのその他の操作"'),
        );
        expect(own).toContain("ウィジェット未設置");
        const joined = html.slice(
            html.indexOf(">Obsidian<"),
            html.indexOf('aria-label="Obsidianのその他の操作"'),
        );
        expect(joined).not.toContain("ウィジェット未設置");
    });

    it("まだ一度も確認していなければ出さない", () => {
        const html = String(
            DashboardView({
                ...base,
                widgetStatus: { [OWN]: { checked: false, installed: false } },
            } as any),
        );
        expect(html).not.toContain("ウィジェット未設置");
    });
});
