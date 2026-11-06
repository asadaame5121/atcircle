import { describe, expect, it } from "vitest";
import { type MembershipInput, resolveMemberships } from "./membership";

const OWNER = "did:plc:owner";
const ADMIN = "did:plc:admin";
const RING = `at://${OWNER}/net.asadaame5121.at-circle.ring/3ring`;
const OTHER_RING = `at://${OWNER}/net.asadaame5121.at-circle.ring/3other`;

let seq = 0;
const tid = () => `3k${(seq++).toString().padStart(11, "0")}`;

const member = (
    did: string,
    opts: { ring?: string; url?: string; createdAt?: string } = {},
) => ({
    uri: `at://${did}/net.asadaame5121.at-circle.member/${tid()}`,
    cid: `cid-${seq}`,
    value: {
        ring: { uri: opts.ring ?? RING },
        url: opts.url ?? `https://${did.slice(8)}.test/`,
        title: `Site of ${did}`,
        rss: `https://${did.slice(8)}.test/feed.xml`,
        createdAt: opts.createdAt ?? "2026-01-01T00:00:00.000Z",
    },
});

const request = (did: string, createdAt = "2026-01-01T00:00:00.000Z") => ({
    uri: `at://${did}/net.asadaame5121.at-circle.request/${tid()}`,
    cid: `cid-${seq}`,
    value: {
        ring: { uri: RING },
        siteUrl: `https://${did.slice(8)}.test/`,
        siteTitle: `Requested ${did}`,
        rssUrl: `https://${did.slice(8)}.test/rss`,
        message: "hi",
        createdAt,
    },
});

const decision = (
    author: string,
    subject: { uri: string; cid: string },
    status: string,
    createdAt = "2026-02-01T00:00:00.000Z",
    ring = RING,
) => ({
    uri: `at://${author}/net.asadaame5121.at-circle.decision/${tid()}`,
    cid: `cid-${seq}`,
    value: {
        ring: { uri: ring },
        subject: { uri: subject.uri, cid: subject.cid },
        status,
        createdAt,
    },
});

const block = (author: string, subject: string) => ({
    uri: `at://${author}/net.asadaame5121.at-circle.block/${tid()}`,
    cid: `cid-${seq}`,
    value: {
        ring: { uri: RING },
        subject,
        createdAt: "2026-03-01T00:00:00.000Z",
    },
});

const input = (overrides: Partial<MembershipInput>): MembershipInput => ({
    ringUri: RING,
    ring: { admin: OWNER, acceptancePolicy: "automatic" },
    members: [],
    requests: [],
    decisions: [],
    blocks: [],
    ...overrides,
});

const statusOf = (result: ReturnType<typeof resolveMemberships>) =>
    Object.fromEntries(result.map((m) => [m.did, m.status]));

describe("resolveMemberships", () => {
    it("自動承認リングではメンバーレコードだけで承認済み", () => {
        const m = member("did:plc:alice");
        const [res] = resolveMemberships(input({ members: [m] }));
        expect(res).toMatchObject({
            did: "did:plc:alice",
            kind: "member",
            status: "approved",
            subjectUri: m.uri,
            subjectCid: m.cid,
            url: "https://alice.test/",
            title: "Site of did:plc:alice",
            rssUrl: "https://alice.test/feed.xml",
        });
    });

    it("要承認リングでは承認の decision がなければ保留", () => {
        const m = member("did:plc:alice");
        const r = request("did:plc:bob");
        const result = resolveMemberships(
            input({
                ring: { admin: OWNER, acceptancePolicy: "manual" },
                members: [m],
                requests: [r],
            }),
        );
        expect(statusOf(result)).toEqual({
            "did:plc:alice": "pending",
            "did:plc:bob": "pending",
        });
        const bob = result.find((x) => x.did === "did:plc:bob");
        expect(bob).toMatchObject({
            kind: "request",
            url: "https://bob.test/",
            title: "Requested did:plc:bob",
            rssUrl: "https://bob.test/rss",
        });
    });

    it("所有者または admin の承認で承認済みになる", () => {
        const r1 = request("did:plc:alice");
        const r2 = request("did:plc:bob");
        const result = resolveMemberships(
            input({
                ring: { admin: ADMIN, acceptancePolicy: "manual" },
                requests: [r1, r2],
                decisions: [
                    decision(OWNER, r1, "approved"),
                    decision(ADMIN, r2, "approved"),
                ],
            }),
        );
        expect(statusOf(result)).toEqual({
            "did:plc:alice": "approved",
            "did:plc:bob": "approved",
        });
    });

    it("所有者・admin 以外の decision は無視する", () => {
        const r = request("did:plc:alice");
        const result = resolveMemberships(
            input({
                ring: { admin: OWNER, acceptancePolicy: "manual" },
                requests: [r],
                decisions: [decision("did:plc:alice", r, "approved")],
            }),
        );
        expect(statusOf(result)).toEqual({ "did:plc:alice": "pending" });
    });

    it("別のリング宛ての decision は無視する", () => {
        const r = request("did:plc:alice");
        const result = resolveMemberships(
            input({
                ring: { admin: OWNER, acceptancePolicy: "manual" },
                requests: [r],
                decisions: [
                    decision(OWNER, r, "approved", undefined, OTHER_RING),
                ],
            }),
        );
        expect(statusOf(result)).toEqual({ "did:plc:alice": "pending" });
    });

    it("同じ対象への decision は新しいものが優先される", () => {
        const m = member("did:plc:alice");
        const result = resolveMemberships(
            input({
                members: [m],
                decisions: [
                    decision(OWNER, m, "suspended", "2026-03-01T00:00:00Z"),
                    decision(OWNER, m, "approved", "2026-02-01T00:00:00Z"),
                ],
            }),
        );
        expect(statusOf(result)).toEqual({ "did:plc:alice": "suspended" });
    });

    it("removed (キック・拒否) された対象は一覧から外れるが、新しいレコードで再参加できる", () => {
        const old = member("did:plc:alice", {
            createdAt: "2026-01-01T00:00:00Z",
        });
        const rejoined = member("did:plc:alice", {
            createdAt: "2026-04-01T00:00:00Z",
        });
        const kicked = resolveMemberships(
            input({
                members: [old],
                decisions: [decision(OWNER, old, "removed")],
            }),
        );
        expect(kicked).toEqual([]);

        const again = resolveMemberships(
            input({
                members: [old, rejoined],
                decisions: [decision(OWNER, old, "removed")],
            }),
        );
        expect(again).toHaveLength(1);
        expect(again[0].subjectUri).toBe(rejoined.uri);
    });

    it("所有者・admin がブロックした DID は除外し、他人のブロックは無視する", () => {
        const result = resolveMemberships(
            input({
                ring: { admin: ADMIN, acceptancePolicy: "automatic" },
                members: [
                    member("did:plc:alice"),
                    member("did:plc:bob"),
                    member("did:plc:carol"),
                ],
                blocks: [
                    block(OWNER, "did:plc:alice"),
                    block(ADMIN, "did:plc:bob"),
                    block("did:plc:random", "did:plc:carol"),
                ],
            }),
        );
        expect(statusOf(result)).toEqual({ "did:plc:carol": "approved" });
    });

    it("別リング宛て・http(s) 以外の URL のレコードは除外する", () => {
        const result = resolveMemberships(
            input({
                members: [
                    member("did:plc:alice", { ring: OTHER_RING }),
                    member("did:plc:bob", { url: "javascript:alert(1)" }),
                    member("did:plc:carol"),
                ],
            }),
        );
        expect(statusOf(result)).toEqual({ "did:plc:carol": "approved" });
    });

    it("1 DID につき 1 件。承認済みを優先し、同じ状態なら新しいレコード", () => {
        const pendingReq = request("did:plc:alice", "2026-05-01T00:00:00Z");
        const approvedOld = member("did:plc:alice", {
            createdAt: "2026-01-01T00:00:00Z",
        });
        const approvedNew = member("did:plc:alice", {
            createdAt: "2026-02-01T00:00:00Z",
            url: "https://alice-new.test/",
        });
        const result = resolveMemberships(
            input({
                ring: { admin: OWNER, acceptancePolicy: "manual" },
                members: [approvedOld, approvedNew],
                requests: [pendingReq],
                decisions: [
                    decision(OWNER, approvedOld, "approved"),
                    decision(OWNER, approvedNew, "approved"),
                ],
            }),
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            status: "approved",
            url: "https://alice-new.test/",
        });
    });

    it("参加日時 (レコードの createdAt) の古い順に並べる", () => {
        const result = resolveMemberships(
            input({
                members: [
                    member("did:plc:c", { createdAt: "2026-03-01T00:00:00Z" }),
                    member("did:plc:a", { createdAt: "2026-01-01T00:00:00Z" }),
                    member("did:plc:b", { createdAt: "2026-02-01T00:00:00Z" }),
                ],
            }),
        );
        expect(result.map((m) => m.did)).toEqual([
            "did:plc:a",
            "did:plc:b",
            "did:plc:c",
        ]);
    });
});
