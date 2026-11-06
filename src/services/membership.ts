import { AtUri } from "@atproto/api";
import { normalizeWebUrl } from "../lib/navigation-session.js";
import type { RecordView } from "./public-records.js";

/**
 * PDS 上のレコードからリングの参加状態を決める (純関数)。
 *
 * 正本となるレコード:
 * - member  (参加者のリポジトリ): 自動承認リングへの参加
 * - request (参加者のリポジトリ): 要承認リングへの参加申請
 * - decision (所有者 / admin のリポジトリ): approved / suspended / removed
 * - block   (所有者 / admin のリポジトリ): DID 単位の締め出し
 *
 * 所有者 (リング URI の DID) と、リングレコードの admin が書いたものだけを
 * 信頼する。
 */

export type MembershipStatus = "approved" | "pending" | "suspended";

export interface ResolvedMembership {
    /** 参加の根拠になったレコード (member または request) */
    subjectUri: string;
    subjectCid: string;
    kind: "member" | "request";
    did: string;
    url: string;
    title: string;
    rssUrl: string | null;
    /** member の note / request の message */
    note: string | null;
    createdAt: string;
    status: MembershipStatus;
}

interface RingRef {
    uri?: string;
}

export interface MemberValue {
    ring?: RingRef;
    url?: string;
    title?: string;
    rss?: string;
    note?: string;
    createdAt?: string;
}

export interface RequestValue {
    ring?: RingRef;
    siteUrl?: string;
    siteTitle?: string;
    rssUrl?: string;
    message?: string;
    createdAt?: string;
}

export interface DecisionValue {
    ring?: RingRef;
    subject?: { uri?: string; cid?: string };
    status?: string;
    createdAt?: string;
}

export interface BlockValue {
    ring?: RingRef;
    subject?: string;
    createdAt?: string;
}

export interface MembershipInput {
    ringUri: string;
    ring: { admin?: string; acceptancePolicy?: string };
    members: RecordView<MemberValue>[];
    requests: RecordView<RequestValue>[];
    decisions: RecordView<DecisionValue>[];
    blocks: RecordView<BlockValue>[];
}

const STATUS_RANK: Record<MembershipStatus, number> = {
    approved: 3,
    suspended: 2,
    pending: 1,
};

const authorOf = (uri: string): string | null => {
    try {
        return new AtUri(uri).hostname;
    } catch {
        return null;
    }
};

const time = (iso?: string) => {
    const t = iso ? Date.parse(iso) : Number.NaN;
    return Number.isNaN(t) ? 0 : t;
};

/** 所有者と admin (リングの管理者) の DID */
export const trustedManagers = (
    ringUri: string,
    ring: { admin?: string },
): Set<string> => {
    const trusted = new Set<string>();
    const owner = authorOf(ringUri);
    if (owner) trusted.add(owner);
    if (ring.admin) trusted.add(ring.admin);
    return trusted;
};

export function resolveMemberships(
    input: MembershipInput,
): ResolvedMembership[] {
    const { ringUri, ring } = input;
    const trusted = trustedManagers(ringUri, ring);
    const forThisRing = (ref?: RingRef) => ref?.uri === ringUri;

    // 管理者のブロック
    const blocked = new Set<string>();
    for (const b of input.blocks) {
        const author = authorOf(b.uri);
        if (author && trusted.has(author) && forThisRing(b.value.ring)) {
            if (b.value.subject) blocked.add(b.value.subject);
        }
    }

    // 対象レコードごとの最新の decision
    const latest = new Map<string, DecisionValue>();
    for (const d of input.decisions) {
        const author = authorOf(d.uri);
        const subject = d.value.subject?.uri;
        if (!author || !trusted.has(author) || !subject) continue;
        if (!forThisRing(d.value.ring)) continue;
        const prev = latest.get(subject);
        if (!prev || time(d.value.createdAt) >= time(prev.createdAt)) {
            latest.set(subject, d.value);
        }
    }

    const defaultForMember: MembershipStatus =
        ring.acceptancePolicy === "manual" ? "pending" : "approved";

    const candidates: ResolvedMembership[] = [];
    const consider = (
        rec: RecordView<MemberValue | RequestValue>,
        kind: "member" | "request",
        fields: {
            url?: string;
            title?: string;
            rss?: string;
            note?: string;
            createdAt?: string;
        },
    ) => {
        const did = authorOf(rec.uri);
        if (!did || blocked.has(did)) return;
        if (!forThisRing(rec.value.ring)) return;
        const url = normalizeWebUrl(fields.url);
        if (!url) return;

        const decided = latest.get(rec.uri)?.status;
        if (decided === "removed") return;
        const status: MembershipStatus =
            decided === "approved" || decided === "suspended"
                ? decided
                : kind === "member"
                  ? defaultForMember
                  : "pending";

        candidates.push({
            subjectUri: rec.uri,
            subjectCid: rec.cid,
            kind,
            did,
            url,
            title: fields.title || url,
            rssUrl: normalizeWebUrl(fields.rss),
            note: fields.note || null,
            createdAt: fields.createdAt || "",
            status,
        });
    };

    for (const m of input.members) {
        consider(m, "member", {
            url: m.value.url,
            title: m.value.title,
            rss: m.value.rss,
            note: m.value.note,
            createdAt: m.value.createdAt,
        });
    }
    for (const r of input.requests) {
        consider(r, "request", {
            url: r.value.siteUrl,
            title: r.value.siteTitle,
            rss: r.value.rssUrl,
            note: r.value.message,
            createdAt: r.value.createdAt,
        });
    }

    // 1 DID につき 1 件: 状態の強い順、同じなら新しいレコード
    const byDid = new Map<string, ResolvedMembership>();
    for (const c of candidates) {
        const prev = byDid.get(c.did);
        if (
            !prev ||
            STATUS_RANK[c.status] > STATUS_RANK[prev.status] ||
            (STATUS_RANK[c.status] === STATUS_RANK[prev.status] &&
                time(c.createdAt) > time(prev.createdAt))
        ) {
            byDid.set(c.did, c);
        }
    }

    return [...byDid.values()].sort(
        (a, b) =>
            time(a.createdAt) - time(b.createdAt) ||
            a.subjectUri.localeCompare(b.subjectUri),
    );
}
