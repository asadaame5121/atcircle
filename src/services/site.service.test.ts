import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    process.env.DB_PATH = ":memory:";
});

const { default: db } = await import("../db.js");
const { AtProtoService } = await import("./atproto.js");
const { SiteService } = await import("./site.service.js");

const ME = "did:plc:me";
const SITE_URI = `at://${ME}/net.asadaame5121.at-circle.site/3site`;
const agent = { assertDid: ME } as any;

const pdsSite = (overrides = {}) => ({
    uri: SITE_URI,
    cid: "c",
    value: {
        url: "https://me.test/",
        title: "Me (PDS)",
        description: "from pds",
        rss: "https://me.test/feed",
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    },
});

const rows = () =>
    db.prepare("SELECT * FROM sites WHERE user_did = ?").bind(ME).all<any>();

const insertLegacy = () =>
    db
        .prepare(
            "INSERT INTO sites (user_did, url, title, description, rss_url, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        )
        .bind(ME, "https://legacy.test/", "Legacy", "old", null)
        .run();

describe("SiteService", () => {
    beforeEach(async () => {
        vi.restoreAllMocks();
        await db.exec("DELETE FROM sites");
        // sites.user_did は users を参照する (本番ではログイン時に作られる)
        await db
            .prepare("INSERT OR IGNORE INTO users (did, handle) VALUES (?, ?)")
            .bind(ME, "me.test")
            .run();
    });

    describe("getMySite", () => {
        it("PDS の site を正本として返し、DB のキャッシュを作る", async () => {
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([
                pdsSite(),
            ] as any);

            const site = await new SiteService(db).getMySite(agent, ME);

            expect(site).toMatchObject({
                user_did: ME,
                url: "https://me.test/",
                title: "Me (PDS)",
                description: "from pds",
                rss_url: "https://me.test/feed",
                site_uri: SITE_URI,
            });
            expect((await rows()).results).toHaveLength(1);
        });

        it("既存の DB の行は PDS の内容で更新する (行は増やさない)", async () => {
            await insertLegacy();
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([
                pdsSite(),
            ] as any);

            await new SiteService(db).getMySite(agent, ME);

            const all = (await rows()).results;
            expect(all).toHaveLength(1);
            expect(all[0]).toMatchObject({
                title: "Me (PDS)",
                site_uri: SITE_URI,
            });
        });

        it("PDS に site がなければ (移行前) DB の登録を返す", async () => {
            await insertLegacy();
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([]);
            const site = await new SiteService(db).getMySite(agent, ME);
            expect(site?.title).toBe("Legacy");
        });

        it("PDS が読めなければ DB のキャッシュを返す", async () => {
            await insertLegacy();
            vi.spyOn(AtProtoService, "listSites").mockRejectedValue(
                new Error("down"),
            );
            expect(
                (await new SiteService(db).getMySite(agent, ME))?.title,
            ).toBe("Legacy");
            // ログインが切れている (agent なし) 場合も DB
            expect((await new SiteService(db).getMySite(null, ME))?.title).toBe(
                "Legacy",
            );
        });
    });

    describe("saveMySite", () => {
        it("初回は PDS に site を作ってから DB に保存する", async () => {
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([]);
            const put = vi
                .spyOn(AtProtoService, "putSite")
                .mockResolvedValue({ uri: SITE_URI, cid: "c" });

            await new SiteService(db).saveMySite(agent, ME, {
                url: "https://me.test/",
                title: "Me",
                rss: "",
                description: "",
            });

            expect(put.mock.calls[0][1]).toMatchObject({
                url: "https://me.test/",
                title: "Me",
            });
            expect(put.mock.calls[0][1]).not.toHaveProperty("uri");
            expect((await rows()).results[0]).toMatchObject({
                title: "Me",
                site_uri: SITE_URI,
            });
        });

        it("登録済みなら同じ site レコードを更新する", async () => {
            await insertLegacy();
            await db
                .prepare("UPDATE sites SET site_uri = ? WHERE user_did = ?")
                .bind(SITE_URI, ME)
                .run();
            const put = vi
                .spyOn(AtProtoService, "putSite")
                .mockResolvedValue({ uri: SITE_URI, cid: "c2" });

            await new SiteService(db).saveMySite(agent, ME, {
                url: "https://new.test/",
                title: "New",
            });

            expect(put.mock.calls[0][1]).toMatchObject({ uri: SITE_URI });
            const all = (await rows()).results;
            expect(all).toHaveLength(1);
            expect(all[0].title).toBe("New");
        });

        it("PDS に書けなければ DB は変えずに例外", async () => {
            await insertLegacy();
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([]);
            vi.spyOn(AtProtoService, "putSite").mockRejectedValue(
                new Error("scope missing"),
            );

            await expect(
                new SiteService(db).saveMySite(agent, ME, {
                    url: "https://new.test/",
                    title: "New",
                }),
            ).rejects.toThrow();
            expect((await rows()).results[0].title).toBe("Legacy");
        });
    });

    describe("migrateSite", () => {
        it("DB にだけある登録から PDS の site を作る", async () => {
            await insertLegacy();
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([]);
            const put = vi
                .spyOn(AtProtoService, "putSite")
                .mockResolvedValue({ uri: SITE_URI, cid: "c" });

            expect(await new SiteService(db).migrateSite(agent, ME)).toBe(
                "created",
            );
            expect(put.mock.calls[0][1]).toMatchObject({
                url: "https://legacy.test/",
                title: "Legacy",
                description: "old",
            });
            expect((await rows()).results[0].site_uri).toBe(SITE_URI);
        });

        it("PDS にすでにあれば作らず、DB と結び付けるだけ", async () => {
            await insertLegacy();
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([
                pdsSite(),
            ] as any);
            const put = vi.spyOn(AtProtoService, "putSite");

            expect(await new SiteService(db).migrateSite(agent, ME)).toBe(
                "linked",
            );
            expect(put).not.toHaveBeenCalled();
            expect((await rows()).results[0].site_uri).toBe(SITE_URI);
        });

        it("DB にも PDS にもなければ何もしない", async () => {
            vi.spyOn(AtProtoService, "listSites").mockResolvedValue([]);
            expect(await new SiteService(db).migrateSite(agent, ME)).toBe(
                "none",
            );
        });
    });
});
