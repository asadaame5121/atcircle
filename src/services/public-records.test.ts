import { describe, expect, it, vi } from "vitest";
import { PublicRecords } from "./public-records";

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });

const make = (handler: (url: URL) => Response | Promise<Response>) => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
        handler(new URL(typeof input === "string" ? input : input.toString())),
    );
    const records = new PublicRecords({
        slingshotUrl: "https://slingshot.test",
        constellationUrl: "https://constellation.test",
        plcUrl: "https://plc.test",
        fetch: fetchMock as unknown as typeof fetch,
    });
    return { records, fetchMock };
};

describe("PublicRecords.getRecord", () => {
    it("Slingshot からレコードを取得し、AT URI を分解して問い合わせる", async () => {
        const { records, fetchMock } = make((url) => {
            expect(url.origin).toBe("https://slingshot.test");
            expect(url.pathname).toBe("/xrpc/com.atproto.repo.getRecord");
            expect(url.searchParams.get("repo")).toBe("did:plc:owner");
            expect(url.searchParams.get("collection")).toBe(
                "net.asadaame5121.at-circle.ring",
            );
            expect(url.searchParams.get("rkey")).toBe("3abc");
            return json({ uri: RING, cid: "bafy", value: { title: "R" } });
        });

        const rec = await records.getRecord(RING);
        expect(rec).toEqual({ uri: RING, cid: "bafy", value: { title: "R" } });

        // 2 回目はキャッシュから返す
        await records.getRecord(RING);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("存在しないレコードは null を返す", async () => {
        const { records } = make(() =>
            json({ error: "RecordNotFound", message: "not found" }, 400),
        );
        expect(await records.getRecord(RING)).toBeNull();
    });

    it("Slingshot が落ちていたら DID の PDS から直接読む", async () => {
        const { records } = make((url) => {
            if (url.origin === "https://slingshot.test") {
                return new Response("bad gateway", { status: 502 });
            }
            if (url.origin === "https://plc.test") {
                expect(url.pathname).toBe("/did:plc:owner");
                return json({
                    service: [
                        {
                            id: "#atproto_pds",
                            type: "AtprotoPersonalDataServer",
                            serviceEndpoint: "https://pds.test",
                        },
                    ],
                });
            }
            expect(url.origin).toBe("https://pds.test");
            return json({ uri: RING, cid: "bafy", value: { title: "R" } });
        });

        const rec = await records.getRecord(RING);
        expect(rec?.value).toEqual({ title: "R" });
    });

    it("invalidate でキャッシュを捨てる", async () => {
        const { records, fetchMock } = make(() =>
            json({ uri: RING, cid: "bafy", value: {} }),
        );
        await records.getRecord(RING);
        records.invalidate(RING);
        await records.getRecord(RING);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("AT URI でなければ例外", async () => {
        const { records } = make(() => json({}));
        await expect(records.getRecord("https://x.test")).rejects.toThrow();
    });
});

describe("PublicRecords.getBacklinks", () => {
    it("Constellation の getBacklinks をページ送りで全件取得する", async () => {
        const { records } = make((url) => {
            expect(url.origin).toBe("https://constellation.test");
            expect(url.pathname).toBe(
                "/xrpc/blue.microcosm.links.getBacklinks",
            );
            expect(url.searchParams.get("subject")).toBe(RING);
            expect(url.searchParams.get("source")).toBe(
                "net.asadaame5121.at-circle.member:ring.uri",
            );
            if (!url.searchParams.get("cursor")) {
                return json({
                    total: 3,
                    records: [
                        {
                            did: "did:plc:a",
                            collection: "net.asadaame5121.at-circle.member",
                            rkey: "1",
                        },
                        {
                            did: "did:plc:b",
                            collection: "net.asadaame5121.at-circle.member",
                            rkey: "2",
                        },
                    ],
                    cursor: "next",
                });
            }
            expect(url.searchParams.get("cursor")).toBe("next");
            return json({
                total: 3,
                records: [
                    {
                        did: "did:plc:c",
                        collection: "net.asadaame5121.at-circle.member",
                        rkey: "3",
                    },
                ],
                cursor: null,
            });
        });

        const uris = await records.getBacklinks(
            RING,
            "net.asadaame5121.at-circle.member",
            "ring.uri",
        );
        expect(uris).toEqual([
            "at://did:plc:a/net.asadaame5121.at-circle.member/1",
            "at://did:plc:b/net.asadaame5121.at-circle.member/2",
            "at://did:plc:c/net.asadaame5121.at-circle.member/3",
        ]);
    });

    it("Constellation が失敗したら例外 (呼び出し側で DB にフォールバックする)", async () => {
        const { records } = make(
            () => new Response("unavailable", { status: 503 }),
        );
        await expect(
            records.getBacklinks(
                RING,
                "net.asadaame5121.at-circle.member",
                "ring.uri",
            ),
        ).rejects.toThrow();
    });
});
