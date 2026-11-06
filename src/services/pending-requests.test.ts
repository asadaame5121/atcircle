import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectPendingRequests } from "./pending-requests";
import { ringIndex } from "./ring-index";

const RING_A = "at://did:plc:me/net.asadaame5121.at-circle.ring/a";
const RING_B = "at://did:plc:me/net.asadaame5121.at-circle.ring/b";

describe("collectPendingRequests", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("PDS から取れたリングは PDS の保留を使い、取れなかったリングは DB の行を残す", async () => {
        vi.spyOn(ringIndex, "getMemberships").mockImplementation(
            async (uri: string) => {
                if (uri === RING_B) throw new Error("down");
                return {
                    ring: { uri, cid: "c", value: { title: "A" } },
                    memberships: [
                        {
                            subjectUri:
                                "at://did:plc:x/net.asadaame5121.at-circle.request/1",
                            did: "did:plc:x",
                            url: "https://x.test/",
                            title: "X",
                            note: "よろしく",
                            status: "pending",
                        },
                        {
                            subjectUri:
                                "at://did:plc:y/net.asadaame5121.at-circle.member/1",
                            did: "did:plc:y",
                            url: "https://y.test/",
                            title: "Y",
                            status: "approved",
                        },
                    ],
                } as any;
            },
        );

        const result = await collectPendingRequests(
            [
                { uri: RING_A, title: "Ring A" },
                { uri: RING_B, title: "Ring B" },
            ],
            [
                { id: 1, ring_uri: RING_A, site_title: "stale" },
                { id: 2, ring_uri: RING_B, site_title: "from db" },
            ],
            [
                { member_uri: "m1", ring_uri: RING_A, site_title: "stale" },
                { member_uri: "m2", ring_uri: RING_B, site_title: "db pm" },
            ],
        );

        expect(result.joinRequests).toEqual([
            { id: 2, ring_uri: RING_B, site_title: "from db" },
            {
                ring_uri: RING_A,
                ring_title: "Ring A",
                subject_uri:
                    "at://did:plc:x/net.asadaame5121.at-circle.request/1",
                user_did: "did:plc:x",
                site_title: "X",
                site_url: "https://x.test/",
                message: "よろしく",
            },
        ]);
        expect(result.pendingMemberships).toEqual([
            { member_uri: "m2", ring_uri: RING_B, site_title: "db pm" },
        ]);
    });
});
