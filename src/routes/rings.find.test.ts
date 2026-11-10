import { describe, expect, it } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../tests/route-utils.js";
import ringsApp from "./rings.js";

const RING_A = "at://did:plc:a/net.asadaame5121.at-circle.ring/a";
const RING_B = "at://did:plc:b/net.asadaame5121.at-circle.ring/b";

const rings = [
    {
        title: "Obsidian",
        uri: RING_B,
        description: "Obsidian部のリング",
        acceptance_policy: "manual",
        member_count: 3,
    },
    {
        title: "個人サイトの集い",
        uri: RING_A,
        description: "個人サイトを愛するみなさん",
        acceptance_policy: "automatic",
        member_count: 7,
    },
];

type DbOpts = {
    site?: any;
    joined?: boolean;
    recentRings?: any[];
    recentJoins?: any[];
};

const makeDb = (opts: DbOpts = {}) =>
    createMockDB({
        all: (query: string) => {
            if (query.includes("member_count")) return rings;
            if (query.includes("FROM memberships m JOIN rings"))
                return opts.recentJoins ?? [];
            if (query.includes("ORDER BY created_at DESC"))
                return opts.recentRings ?? [];
            return [];
        },
        first: (query: string) => {
            if (query.includes("FROM sites WHERE user_did")) return opts.site;
            if (query.includes("UNION ALL"))
                return opts.joined ? { 1: 1 } : null;
            return null;
        },
    });

const get = async (path: string, opts: DbOpts & { login?: boolean } = {}) => {
    const headers: Record<string, string> = { "Accept-Language": "ja" };
    if (opts.login) {
        const token = await createMockAuthToken("did:plc:me", "me.test");
        headers.Cookie = `session=${token}`;
    }
    const app = wrapApp(ringsApp);
    const res = await app.request(path, { headers }, { DB: makeDb(opts) });
    return { res, html: await res.text() };
};

describe("GET /rings（リングを探す）", () => {
    it("参加サイトの多い順に一覧を出し、件数を見出しに入れる", async () => {
        const { res, html } = await get("/");
        expect(res.status).toBe(200);
        expect(html).toContain("■ リングに入る ■");
        expect(html).toContain("リング一覧（2件）");
        expect(html.indexOf("個人サイトの集い")).toBeLessThan(
            html.indexOf("Obsidian"),
        );
        expect(html).toMatch(/<a href="\/rings" aria-current="page"/);
    });

    it("「探して参加」と「立ち上げる」を切り替えられる", async () => {
        const { html } = await get("/");
        expect(html).toMatch(
            /<a href="\/rings"[^>]*aria-current="page"[^>]*>探して参加<\/a>/,
        );
        expect(html).toContain('href="/rings/new"');
    });

    it("q で名前と説明を絞り込む", async () => {
        const { html } = await get("/?q=obsidian%E9%83%A8");
        expect(html).toContain("リング一覧（1件）");
        expect(html).toContain('value="obsidian部"');
        expect(html).not.toContain(">個人サイトの集い<");
    });

    it("見つからなければ立ち上げへ誘導する", async () => {
        const { html } = await get("/?q=zzz");
        expect(html).toContain("リング一覧（0件）");
        expect(html).toContain("見つかりません");
    });

    it("行を選ぶリンクは検索語を保ち、参加欄へ飛ぶ", async () => {
        const { html } = await get("/?q=%E5%80%8B%E4%BA%BA");
        expect(html).toContain(
            `href="/rings?q=%E5%80%8B%E4%BA%BA&amp;select=${encodeURIComponent(RING_A)}#join"`,
        );
    });

    it("未選択なら参加欄は「← リングを選択」だけ", async () => {
        const { html } = await get("/");
        expect(html).toContain("← リングを選択");
        expect(html).not.toContain('action="/dashboard/ring/join"');
    });

    it("未ログインで選ぶと、ログインして参加するリンクを出す", async () => {
        const { html } = await get(`/?select=${encodeURIComponent(RING_B)}`);
        expect(html).toContain("★ Obsidian");
        expect(html).toContain("3人・承認制");
        expect(html).toContain(
            `href="/login?next=${encodeURIComponent(`/rings?select=${encodeURIComponent(RING_B)}`)}"`,
        );
        expect(html).not.toContain('action="/dashboard/ring/join"');
        // 進み具合はログイン後だけ
        expect(html).not.toContain('aria-label="進み具合"');
    });

    it("ログイン中は自分のサイトを入れた参加フォームを出す", async () => {
        const site = {
            url: "https://asadaame5121.net",
            title: "DropGarden",
            rss_url: "https://asadaame5121.net/feed.rss",
        };
        const { html } = await get(`/?select=${encodeURIComponent(RING_A)}`, {
            login: true,
            site,
        });
        expect(html).toContain('aria-label="進み具合"');
        expect(html).toContain('action="/dashboard/ring/join"');
        expect(html).toContain(`name="ring_uri" value="${RING_A}"`);
        expect(html).toContain('value="https://asadaame5121.net"');
        expect(html).toContain('value="DropGarden"');
        expect(html).toContain('value="https://asadaame5121.net/feed.rss"');
        expect(html).toContain("参加する ≫");
    });

    it("承認制のリングでは「参加を申請」にする", async () => {
        const { html } = await get(`/?select=${encodeURIComponent(RING_B)}`, {
            login: true,
        });
        expect(html).toContain("参加を申請 ≫");
        expect(html).toContain('name="url" type="url" required');
    });

    it("参加済み・申請中ならフォームを出さない", async () => {
        const { html } = await get(`/?select=${encodeURIComponent(RING_A)}`, {
            login: true,
            joined: true,
        });
        expect(html).not.toContain('action="/dashboard/ring/join"');
        expect(html).toContain("参加済み、または申請中です");
    });

    it("最近の動きがあれば流れる文字で知らせる", async () => {
        const { html } = await get("/", {
            recentRings: [{ title: "手作りWebの会" }],
            recentJoins: [{ title: "Obsidian" }],
        });
        expect(html).toContain('class="rt-marquee"');
        expect(html).toContain("新しいリング「手作りWebの会」ができました");
        expect(html).toContain("「Obsidian」に新しいサイトが参加");
    });

    it("最近の動きがなければ流れる文字を出さない", async () => {
        const { html } = await get("/");
        expect(html).not.toContain('class="rt-marquee"');
    });
});
