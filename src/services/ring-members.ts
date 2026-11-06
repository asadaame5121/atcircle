import { logger as pinoLogger } from "../lib/logger.js";
import {
    type Member,
    MemberRepository,
} from "../repositories/member.repository.js";
import type { ResolvedMembership } from "./membership.js";
import { type RingValue, ringIndex } from "./ring-index.js";

/**
 * リングのメンバー一覧の読み取り口。
 *
 * PDS (Constellation + 各レコード) を正本として読み、取れないときだけ
 * ローカル DB のキャッシュを返す。返す形は従来の DB の行 (Member) と同じ。
 */

export interface MemberRow extends Member {
    last_verified_at?: number | null;
}

type Source = "pds" | "db";

const toRow = (m: ResolvedMembership): MemberRow => ({
    id: 0,
    user_did: m.did,
    url: m.url,
    title: m.title,
    rss_url: m.rssUrl,
    description: null,
    is_active: 1,
    member_uri: m.subjectUri,
    status: m.status,
    created_at: m.createdAt,
    widget_installed: 0,
});

/** DB にある補足情報 (サイトの説明・ウィジェット確認結果) を DID ごとに引く */
async function siteExtras(
    db: D1Database,
    ringUri: string,
    dids: string[],
): Promise<Map<string, Partial<MemberRow>>> {
    const extras = new Map<string, Partial<MemberRow>>();
    if (dids.length === 0) return extras;
    try {
        const placeholders = dids.map(() => "?").join(", ");
        const res = await db
            .prepare(`
                SELECT s.user_did, s.description,
                       m.widget_installed, m.last_verified_at
                FROM sites s
                LEFT JOIN memberships m
                    ON m.site_id = s.id AND m.ring_uri = ?
                WHERE s.user_did IN (${placeholders})
            `)
            .bind(ringUri, ...dids)
            .all<{
                user_did: string;
                description: string | null;
                widget_installed: number | null;
                last_verified_at: number | null;
            }>();
        for (const r of res.results ?? []) {
            extras.set(r.user_did, {
                description: r.description ?? null,
                widget_installed: r.widget_installed ?? 0,
                last_verified_at: r.last_verified_at ?? null,
            });
        }
    } catch (e) {
        pinoLogger.warn({ msg: "[RingMembers] Could not read site extras", e });
    }
    return extras;
}

/**
 * 移行期間の扱い: decision がまだ PDS にない (所有者が同期していない) ため
 * PDS 上は保留でも、DB で承認済みの同じ参加レコードは承認済みとして扱う。
 * 所有者が同期すると decision が書かれ、この補正は不要になる。
 */
async function applyLegacyApprovals(
    db: D1Database,
    ringUri: string,
    memberships: ResolvedMembership[],
): Promise<ResolvedMembership[]> {
    if (!memberships.some((m) => m.status === "pending")) return memberships;
    let approved: Set<string>;
    try {
        const res = await db
            .prepare(
                "SELECT member_uri FROM memberships WHERE ring_uri = ? AND status = 'approved'",
            )
            .bind(ringUri)
            .all<{ member_uri: string }>();
        approved = new Set((res.results ?? []).map((r) => r.member_uri));
    } catch {
        return memberships;
    }
    return memberships.map((m) =>
        m.status === "pending" && approved.has(m.subjectUri)
            ? { ...m, status: "approved" }
            : m,
    );
}

async function fromPds(
    db: D1Database,
    ringUri: string,
    filter: (m: ResolvedMembership) => boolean,
): Promise<{ rows: MemberRow[]; ring: RingValue | null }> {
    const view = await ringIndex.getMemberships(ringUri);
    if (!view) return { rows: [], ring: null };
    const memberships = await applyLegacyApprovals(
        db,
        ringUri,
        view.memberships,
    );
    const selected = memberships.filter(filter);
    const extras = await siteExtras(
        db,
        ringUri,
        selected.map((m) => m.did),
    );
    const rows = selected.map((m) => {
        const row = toRow(m);
        const extra = extras.get(m.did);
        return {
            ...row,
            description: extra?.description ?? null,
            widget_installed: extra?.widget_installed ?? 0,
            last_verified_at: extra?.last_verified_at ?? null,
        };
    });
    return { rows, ring: view.ring.value };
}

/** 公開ページ・巡回用: 承認済みメンバー (参加順) */
export async function getApprovedMembers(
    db: D1Database,
    ringUri: string,
): Promise<{
    members: MemberRow[];
    source: Source;
    /** PDS のリングレコード (読めたとき) */
    ring?: RingValue | null;
}> {
    try {
        const { rows, ring } = await fromPds(
            db,
            ringUri,
            (m) => m.status === "approved",
        );
        return { members: rows, source: "pds", ring };
    } catch (e) {
        pinoLogger.warn({
            msg: "[RingMembers] PDS unavailable, using DB cache",
            ringUri,
            error: e instanceof Error ? e.message : String(e),
        });
    }
    const members = await new MemberRepository(db).findApprovedMembersByRing(
        ringUri,
    );
    return { members, source: "db" };
}

/** 管理画面用: 全状態のメンバー (保留・停止を含む) */
export async function getAllMemberships(
    db: D1Database,
    ringUri: string,
): Promise<MemberRow[]> {
    try {
        return (await fromPds(db, ringUri, () => true)).rows;
    } catch (e) {
        pinoLogger.warn({
            msg: "[RingMembers] PDS unavailable, using DB cache (admin list)",
            ringUri,
            error: e instanceof Error ? e.message : String(e),
        });
    }
    const res = await db
        .prepare(`
            SELECT m.id, m.member_uri, s.url, s.title, s.user_did, m.status,
                   m.widget_installed, m.last_verified_at, m.created_at
            FROM memberships m
            JOIN sites s ON m.site_id = s.id
            WHERE m.ring_uri = ?
            GROUP BY s.id
            ORDER BY m.created_at DESC
        `)
        .bind(ringUri)
        .all<MemberRow>();
    return res.results ?? [];
}
