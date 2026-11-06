import { describe, expect, it, vi } from "vitest";
import type { PublicRecords, RecordView } from "./public-records";
import { RingIndex } from "./ring-index";

const OWNER = "did:plc:owner";
const RING = `at://${OWNER}/net.asadaame5121.at-circle.ring/3ring`;
const NS = "net.asadaame5121.at-circle";

const store: Record<string, RecordView<any>> = {
    [RING]: {
        uri: RING,
        cid: "ring-cid",
        value: { title: "R", admin: OWNER, acceptancePolicy: "manual" },
    },
    [`at://did:plc:alice/${NS}.request/1`]: {
        uri: `at://did:plc:alice/${NS}.request/1`,
        cid: "req-cid",
        value: {
            ring: { uri: RING },
            siteUrl: "https://alice.test/",
            siteTitle: "Alice",
            createdAt: "2026-01-01T00:00:00Z",
        },
    },
    [`at://${OWNER}/${NS}.decision/1`]: {
        uri: `at://${OWNER}/${NS}.decision/1`,
        cid: "dec-cid",
        value: {
            ring: { uri: RING },
            subject: { uri: `at://did:plc:alice/${NS}.request/1`, cid: "x" },
            status: "approved",
            createdAt: "2026-01-02T00:00:00Z",
        },
    },
};

const backlinkMap: Record<string, string[]> = {
    [`${NS}.member`]: [],
    [`${NS}.request`]: [`at://did:plc:alice/${NS}.request/1`],
    [`${NS}.decision`]: [
        `at://${OWNER}/${NS}.decision/1`,
        // 管理者以外の decision は取得すらしない
        `at://did:plc:mallory/${NS}.decision/9`,
    ],
    [`${NS}.block`]: [],
};

const fakeRecords = () => {
    const getRecord = vi.fn(async (uri: string) => store[uri] ?? null);
    const getBacklinks = vi.fn(
        async (_subject: string, collection: string, _path: string) =>
            backlinkMap[collection] ?? [],
    );
    const invalidate = vi.fn();
    return {
        records: {
            getRecord,
            getBacklinks,
            invalidate,
        } as unknown as PublicRecords,
        getRecord,
        getBacklinks,
        invalidate,
    };
};

describe("RingIndex.getMemberships", () => {
    it("バックリンクとレコードから参加状態を組み立てる", async () => {
        const { records, getRecord, getBacklinks } = fakeRecords();
        const index = new RingIndex(records);

        const view = await index.getMemberships(RING);

        expect(view?.ring.value.title).toBe("R");
        expect(view?.memberships).toHaveLength(1);
        expect(view?.memberships[0]).toMatchObject({
            did: "did:plc:alice",
            status: "approved",
            url: "https://alice.test/",
        });
        expect(getBacklinks).toHaveBeenCalledWith(
            RING,
            `${NS}.member`,
            "ring.uri",
        );
        expect(getRecord).not.toHaveBeenCalledWith(
            `at://did:plc:mallory/${NS}.decision/9`,
        );
    });

    it("リングが存在しなければ null", async () => {
        const { records } = fakeRecords();
        const index = new RingIndex(records);
        expect(
            await index.getMemberships(
                `at://${OWNER}/net.asadaame5121.at-circle.ring/nope`,
            ),
        ).toBeNull();
    });

    it("結果をキャッシュし、invalidate で捨てる", async () => {
        const { records, getBacklinks, invalidate } = fakeRecords();
        const index = new RingIndex(records);

        await index.getMemberships(RING);
        await index.getMemberships(RING);
        expect(getBacklinks).toHaveBeenCalledTimes(4);

        index.invalidate(RING);
        expect(invalidate).toHaveBeenCalledWith(RING);
        await index.getMemberships(RING);
        expect(getBacklinks).toHaveBeenCalledTimes(8);
    });

    it("バックリンクが取れなければ例外 (呼び出し側で DB にフォールバック)", async () => {
        const { records, getBacklinks } = fakeRecords();
        getBacklinks.mockRejectedValueOnce(new Error("down"));
        await expect(
            new RingIndex(records).getMemberships(RING),
        ).rejects.toThrow();
    });
});
