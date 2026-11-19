import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    process.env.DB_PATH = ":memory:";
});

const { default: db } = await import("../db.js");
const { getMyWidgetStatus, markWidgetSeen, sameSite, verifyAllWidgets } =
    await import("./widget-presence.js");

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/r1";
const OTHER_RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/r2";
const DAY = 24 * 60 * 60;
const NOW = 1_800_000_000;

const row = async (siteId: number, ring = RING) =>
    db
        .prepare(
            "SELECT widget_installed, last_verified_at, widget_seen_at FROM memberships WHERE site_id = ? AND ring_uri = ?",
        )
        .bind(siteId, ring)
        .first<any>();

beforeEach(async () => {
    await db.exec("DELETE FROM memberships");
    await db.exec("DELETE FROM sites");
    await db.exec("DELETE FROM rings");
    await db.exec("DELETE FROM users");
    await db.exec(`
        INSERT INTO users (did, handle) VALUES
            ('did:plc:alice', 'alice.example'),
            ('did:plc:bob', 'bob.example');
        INSERT INTO rings (uri, owner_did, title) VALUES
            ('${RING}', 'did:plc:owner', 'R1'),
            ('${OTHER_RING}', 'did:plc:owner', 'R2');
        INSERT INTO sites (id, user_did, url, title) VALUES
            (1, 'did:plc:alice', 'https://www.alice.example/', 'Alice'),
            (2, 'did:plc:bob', 'https://bob.example/blog/', 'Bob');
        INSERT INTO memberships (ring_uri, site_id, member_uri, status) VALUES
            ('${RING}', 1, 'at://alice/m1', 'approved'),
            ('${RING}', 2, 'at://bob/m1', 'approved'),
            ('${OTHER_RING}', 1, 'at://alice/m2', 'approved');
    `);
});

describe("sameSite（同じサイトかどうか）", () => {
    it("ホスト名で比べ、www と大文字小文字とパスは無視する", () => {
        expect(
            sameSite(
                "https://WWW.alice.example/",
                "https://alice.example/post/1",
            ),
        ).toBe(true);
        expect(
            sameSite("https://alice.example", "http://alice.example:443/"),
        ).toBe(true);
        expect(sameSite("https://alice.example", "https://evil.example")).toBe(
            false,
        );
        expect(sameSite("https://alice.example", "javascript:alert(1)")).toBe(
            false,
        );
        expect(sameSite("https://alice.example", "")).toBe(false);
    });
});

describe("markWidgetSeen（ウィジェットが表示・クリックされた）", () => {
    it("そのリングの、URL が同じサイトの参加だけを設置済みにする", async () => {
        expect(
            await markWidgetSeen(
                db,
                RING,
                "https://alice.example/2026/11/post",
                NOW,
            ),
        ).toBe(true);
        expect(await row(1)).toMatchObject({
            widget_installed: 1,
            widget_seen_at: NOW,
        });
        // 別のリング・別のサイトは変えない
        expect((await row(1, OTHER_RING)).widget_installed).toBe(0);
        expect((await row(2)).widget_installed).toBe(0);
    });

    it("参加していないサイトなら何もしない", async () => {
        expect(
            await markWidgetSeen(db, RING, "https://stranger.example/", NOW),
        ).toBe(false);
    });

    it("1時間以内に記録済みなら書き込まない（アクセスのたびに書かない）", async () => {
        await markWidgetSeen(db, RING, "https://alice.example/", NOW);
        await markWidgetSeen(db, RING, "https://alice.example/", NOW + 60);
        expect((await row(1)).widget_seen_at).toBe(NOW);
        await markWidgetSeen(db, RING, "https://alice.example/", NOW + 3601);
        expect((await row(1)).widget_seen_at).toBe(NOW + 3601);
    });
});

describe("verifyAllWidgets（毎日の自動確認）", () => {
    it("各参加サイトを取得して結果を記録する", async () => {
        const verify = vi.fn(async (url: string) => url.includes("alice"));
        const result = await verifyAllWidgets(db, { verify, now: NOW });
        expect(result).toEqual({ checked: 3, installed: 2 });
        expect(verify).toHaveBeenCalledWith("https://www.alice.example/", RING);
        expect(await row(1)).toMatchObject({
            widget_installed: 1,
            last_verified_at: NOW,
        });
        expect(await row(2)).toMatchObject({
            widget_installed: 0,
            last_verified_at: NOW,
        });
    });

    it("取得で見つからなくても、7日以内にウィジェットの表示を確認していれば設置済みのまま", async () => {
        await markWidgetSeen(db, RING, "https://bob.example/", NOW - 6 * DAY);
        await verifyAllWidgets(db, { verify: async () => false, now: NOW });
        expect((await row(2)).widget_installed).toBe(1);
    });

    it("最後の確認が7日より前なら未設置にする", async () => {
        await markWidgetSeen(db, RING, "https://bob.example/", NOW - 8 * DAY);
        await verifyAllWidgets(db, { verify: async () => false, now: NOW });
        expect((await row(2)).widget_installed).toBe(0);
    });

    it("1件の失敗で全体を止めない", async () => {
        const verify = vi.fn(async (url: string) => {
            if (url.includes("bob")) throw new Error("boom");
            return true;
        });
        const result = await verifyAllWidgets(db, { verify, now: NOW });
        expect(result.checked).toBe(3);
        expect((await row(1)).widget_installed).toBe(1);
    });
});

describe("getMyWidgetStatus（ダッシュボード用）", () => {
    it("自分のサイトの参加ごとに、確認済みかと設置の有無を返す", async () => {
        await verifyAllWidgets(db, { verify: async () => false, now: NOW });
        await markWidgetSeen(db, OTHER_RING, "https://alice.example/", NOW);
        const status = await getMyWidgetStatus(db, "did:plc:alice");
        expect(status[RING]).toEqual({ checked: true, installed: false });
        expect(status[OTHER_RING]).toEqual({ checked: true, installed: true });
    });

    it("一度も確認していなければ checked は false", async () => {
        const status = await getMyWidgetStatus(db, "did:plc:alice");
        expect(status[RING]).toEqual({ checked: false, installed: false });
    });
});
