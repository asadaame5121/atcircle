import { beforeEach, describe, expect, it, vi } from "vitest";

// 実際の SQLite (メモリ上) にスキーマを作って検証する
vi.hoisted(() => {
    process.env.DB_PATH = ":memory:";
});

const { default: db } = await import("../db.js");
const { RingRepository } = await import("./ring.repository.js");

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";
const OTHER = "at://did:plc:other/net.asadaame5121.at-circle.ring/3xyz";

const baseRecord = {
    title: "Ring",
    description: "desc",
    admin: "did:plc:owner",
    status: "open",
    acceptancePolicy: "manual",
    createdAt: "2026-01-02T03:04:05.000Z",
};

const row = (uri: string) =>
    db.prepare("SELECT * FROM rings WHERE uri = ?").bind(uri).first<any>();

describe("RingRepository.upsertFromRecord", () => {
    beforeEach(async () => {
        await db.exec("DELETE FROM rings");
    });

    it("リングレコードからキャッシュ行を作る", async () => {
        await new RingRepository(db).upsertFromRecord(RING, {
            ...baseRecord,
            slug: "my-ring",
            bannerUrl: "https://img.test/b.png",
        });
        expect(await row(RING)).toMatchObject({
            owner_did: "did:plc:owner",
            admin_did: "did:plc:owner",
            title: "Ring",
            acceptance_policy: "manual",
            status: "open",
            slug: "my-ring",
            banner_url: "https://img.test/b.png",
            created_at: Math.floor(Date.parse(baseRecord.createdAt) / 1000),
        });
    });

    it("レコードに slug / bannerUrl がなければ既存の値を消さない", async () => {
        const repo = new RingRepository(db);
        await repo.upsertFromRecord(RING, {
            ...baseRecord,
            slug: "keep-me",
            bannerUrl: "https://img.test/keep.png",
        });
        await repo.upsertFromRecord(RING, { ...baseRecord, title: "Renamed" });

        expect(await row(RING)).toMatchObject({
            title: "Renamed",
            slug: "keep-me",
            banner_url: "https://img.test/keep.png",
        });
    });

    it("他のリングが使っている slug は取らない (先着優先)", async () => {
        const repo = new RingRepository(db);
        await repo.upsertFromRecord(OTHER, {
            ...baseRecord,
            admin: "did:plc:other",
            slug: "taken",
        });
        await repo.upsertFromRecord(RING, { ...baseRecord, slug: "taken" });

        expect((await row(OTHER)).slug).toBe("taken");
        expect((await row(RING)).slug).toBeNull();
    });
});

describe("RingRepository.isSlugTaken", () => {
    it("自分以外のリングが使っていれば true", async () => {
        await db.exec("DELETE FROM rings");
        const repo = new RingRepository(db);
        await repo.upsertFromRecord(OTHER, { ...baseRecord, slug: "taken" });

        expect(await repo.isSlugTaken("taken", RING)).toBe(true);
        expect(await repo.isSlugTaken("taken", OTHER)).toBe(false);
        expect(await repo.isSlugTaken("free", RING)).toBe(false);
    });
});
