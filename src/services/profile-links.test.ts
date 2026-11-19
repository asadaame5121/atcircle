import { describe, expect, it, vi } from "vitest";
import { discoverProfileLinks } from "./profile-links";
import type { PublicRecords } from "./public-records";

const ME = "did:plc:me";
const PROFILE = `at://${ME}/app.bsky.actor.profile/self`;
const link = (rkey: string) => `at://${ME}/app.bsky.actor.link/${rkey}`;

const recordsFrom = (store: Record<string, unknown>) =>
    ({
        getRecord: vi.fn(async (uri: string) =>
            uri in store ? { uri, cid: `cid-${uri}`, value: store[uri] } : null,
        ),
    }) as unknown as PublicRecords;

describe("discoverProfileLinks", () => {
    it("プロフィールの links の順に app.bsky.actor.link を返す", async () => {
        const records = recordsFrom({
            [PROFILE]: {
                links: [
                    { uri: link("b"), cid: "cid-b" },
                    { uri: link("a"), cid: "cid-a" },
                ],
                website: "https://old.test/",
            },
            [link("a")]: { url: "https://a.test/", title: "A" },
            [link("b")]: { url: "https://b.test/" },
        });

        expect(await discoverProfileLinks(ME, records)).toEqual([
            {
                url: "https://b.test/",
                title: undefined,
                link: { uri: link("b"), cid: `cid-${link("b")}` },
            },
            {
                url: "https://a.test/",
                title: "A",
                link: { uri: link("a"), cid: `cid-${link("a")}` },
            },
        ]);
    });

    it("links がなければ非推奨の website を使う", async () => {
        const records = recordsFrom({
            [PROFILE]: { website: "https://old.test/" },
        });
        expect(await discoverProfileLinks(ME, records)).toEqual([
            { url: "https://old.test/" },
        ]);
    });

    it("他人のリンク・http(s) 以外・消えたレコードは除く", async () => {
        const records = recordsFrom({
            [PROFILE]: {
                links: [
                    {
                        uri: "at://did:plc:other/app.bsky.actor.link/x",
                        cid: "x",
                    },
                    { uri: link("js"), cid: "js" },
                    { uri: link("gone"), cid: "gone" },
                    { uri: link("ok"), cid: "ok" },
                ],
            },
            [link("js")]: { url: "javascript:alert(1)" },
            [link("ok")]: { url: "https://ok.test/" },
        });
        const result = await discoverProfileLinks(ME, records);
        expect(result.map((r) => r.url)).toEqual(["https://ok.test/"]);
    });

    it("プロフィールが読めなければ空", async () => {
        const records = {
            getRecord: vi.fn(async () => {
                throw new Error("down");
            }),
        } as unknown as PublicRecords;
        expect(await discoverProfileLinks(ME, records)).toEqual([]);
    });
});
