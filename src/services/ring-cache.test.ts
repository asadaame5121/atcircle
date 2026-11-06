import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    process.env.DB_PATH = ":memory:";
});

const { default: db } = await import("../db.js");
const { RingRepository } = await import("../repositories/ring.repository.js");
const { publicRecords } = await import("./public-records.js");
const { findRing, refreshRingCache } = await import("./ring-cache.js");

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";
const record = {
    title: "From PDS",
    description: "d",
    admin: "did:plc:owner",
    status: "open",
    acceptancePolicy: "automatic",
    slug: "pds-ring",
    createdAt: "2026-01-01T00:00:00.000Z",
};

describe("findRing", () => {
    beforeEach(async () => {
        vi.restoreAllMocks();
        await db.exec("DELETE FROM rings");
    });

    it("キャッシュにあればそれを返す (PDS を読まない)", async () => {
        await new RingRepository(db).upsertFromRecord(RING, record);
        const spy = vi.spyOn(publicRecords, "getRecord");
        expect((await findRing(db, { uri: RING }))?.title).toBe("From PDS");
        expect((await findRing(db, { slug: "pds-ring" }))?.uri).toBe(RING);
        expect(spy).not.toHaveBeenCalled();
    });

    it("キャッシュになければ PDS から取り込む", async () => {
        vi.spyOn(publicRecords, "getRecord").mockResolvedValue({
            uri: RING,
            cid: "c",
            value: record,
        });
        const ring = await findRing(db, { uri: RING });
        expect(ring).toMatchObject({ uri: RING, title: "From PDS" });
        // 取り込んだ結果は DB に残る
        expect((await new RingRepository(db).findByUri(RING))?.slug).toBe(
            "pds-ring",
        );
    });

    it("PDS にもなければ null", async () => {
        vi.spyOn(publicRecords, "getRecord").mockResolvedValue(null);
        expect(await findRing(db, { uri: RING })).toBeNull();
    });
});

describe("refreshRingCache", () => {
    beforeEach(async () => {
        await db.exec("DELETE FROM rings");
    });

    it("PDS の内容が変わっていればキャッシュを更新する", async () => {
        const repo = new RingRepository(db);
        await repo.upsertFromRecord(RING, record);
        const row = (await repo.findByUri(RING)) as NonNullable<
            Awaited<ReturnType<typeof repo.findByUri>>
        >;

        const updated = await refreshRingCache(db, row, {
            ...record,
            title: "Renamed",
            bannerUrl: "https://img.test/b.png",
        });
        expect(updated).toMatchObject({
            title: "Renamed",
            banner_url: "https://img.test/b.png",
        });
        expect((await repo.findByUri(RING))?.title).toBe("Renamed");
    });

    it("変わっていなければ書き込まない", async () => {
        const repo = new RingRepository(db);
        await repo.upsertFromRecord(RING, record);
        const row = (await repo.findByUri(RING)) as NonNullable<
            Awaited<ReturnType<typeof repo.findByUri>>
        >;
        const spy = vi.spyOn(RingRepository.prototype, "upsertFromRecord");
        expect(await refreshRingCache(db, row, record)).toBe(row);
        expect(spy).not.toHaveBeenCalled();
    });
});
