import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDB } from "../../tests/route-utils.js";
import { ringIndex } from "./ring-index";
import { getAllMemberships, getApprovedMembers } from "./ring-members";

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";

const membership = (did: string, status: string, extra = {}) => ({
    subjectUri: `at://${did}/net.asadaame5121.at-circle.member/1`,
    subjectCid: "c",
    kind: "member",
    did,
    url: `https://${did.slice(8)}.test/`,
    title: `Site ${did}`,
    rssUrl: null,
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    status,
    ...extra,
});

describe("getApprovedMembers", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("PDS (Constellation) から承認済みメンバーだけを返す", async () => {
        vi.spyOn(ringIndex, "getMemberships").mockResolvedValue({
            ring: { uri: RING, cid: "c", value: { title: "R" } },
            memberships: [
                membership("did:plc:alice", "approved", {
                    rssUrl: "https://alice.test/feed",
                }),
                membership("did:plc:bob", "pending"),
                membership("did:plc:carol", "suspended"),
            ],
        } as any);
        const db = createMockDB({
            all: [{ user_did: "did:plc:alice", description: "Alice の説明" }],
        });

        const { members, source } = await getApprovedMembers(db, RING);

        expect(source).toBe("pds");
        expect(members).toHaveLength(1);
        expect(members[0]).toMatchObject({
            user_did: "did:plc:alice",
            member_uri:
                "at://did:plc:alice/net.asadaame5121.at-circle.member/1",
            url: "https://alice.test/",
            title: "Site did:plc:alice",
            rss_url: "https://alice.test/feed",
            description: "Alice の説明",
            status: "approved",
        });
    });

    it("PDS から取れなければ DB のキャッシュを返す", async () => {
        vi.spyOn(ringIndex, "getMemberships").mockRejectedValue(
            new Error("down"),
        );
        const db = createMockDB({
            all: [{ id: 1, user_did: "did:plc:x", url: "https://x.test/" }],
        });

        const { members, source } = await getApprovedMembers(db, RING);
        expect(source).toBe("db");
        expect(members[0].url).toBe("https://x.test/");
    });

    it("リングレコードが存在しなければ空 (削除済みのリング)", async () => {
        vi.spyOn(ringIndex, "getMemberships").mockResolvedValue(null);
        const db = createMockDB({ all: [{ url: "https://stale.test/" }] });
        const { members, source } = await getApprovedMembers(db, RING);
        expect(source).toBe("pds");
        expect(members).toEqual([]);
    });
});

describe("getAllMemberships (管理画面用)", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("全状態のメンバーに DB のウィジェット確認結果を添える", async () => {
        vi.spyOn(ringIndex, "getMemberships").mockResolvedValue({
            ring: { uri: RING, cid: "c", value: { title: "R" } },
            memberships: [
                membership("did:plc:alice", "approved"),
                membership("did:plc:bob", "pending"),
            ],
        } as any);
        const db = createMockDB({
            all: [
                {
                    user_did: "did:plc:alice",
                    widget_installed: 1,
                    last_verified_at: 123,
                },
            ],
        });

        const rows = await getAllMemberships(db, RING);
        expect(rows).toHaveLength(2);
        expect(rows.find((r) => r.user_did === "did:plc:alice")).toMatchObject({
            status: "approved",
            widget_installed: 1,
            last_verified_at: 123,
        });
        expect(rows.find((r) => r.user_did === "did:plc:bob")).toMatchObject({
            status: "pending",
            widget_installed: 0,
        });
    });
});
