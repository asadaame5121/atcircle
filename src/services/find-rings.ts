import type { RingRowData } from "../components/RingRow.js";

/** 名前と説明に検索語を含むリングだけを残す（大文字小文字を区別しない） */
export const filterRings = <T extends RingRowData>(
    rings: T[],
    query: string,
): T[] => {
    const q = query.trim().toLowerCase();
    if (!q) return rings;
    return rings.filter((r) =>
        `${r.title} ${r.description ?? ""}`.toLowerCase().includes(q),
    );
};

export type RecentActivity = { kind: "ring" | "join"; title: string };

const RECENT_SECONDS = 30 * 24 * 60 * 60;

/** 直近30日の新しいリングと新しい参加（各3件まで）。流れる文字に使う */
export const getRecentActivity = async (
    db: D1Database,
): Promise<RecentActivity[]> => {
    const since = Math.floor(Date.now() / 1000) - RECENT_SECONDS;
    const [newRings, newJoins] = await Promise.all([
        db
            .prepare(
                "SELECT title FROM rings WHERE status = 'open' AND created_at >= ? ORDER BY created_at DESC LIMIT 3",
            )
            .bind(since)
            .all<{ title: string }>(),
        db
            .prepare(
                "SELECT r.title FROM memberships m JOIN rings r ON r.uri = m.ring_uri WHERE m.status = 'approved' AND r.status = 'open' AND m.created_at >= ? ORDER BY m.created_at DESC LIMIT 3",
            )
            .bind(since)
            .all<{ title: string }>(),
    ]);
    return [
        ...(newJoins.results ?? []).map((r) => ({
            kind: "join" as const,
            title: r.title,
        })),
        ...(newRings.results ?? []).map((r) => ({
            kind: "ring" as const,
            title: r.title,
        })),
    ];
};

export type JoinContext = {
    site: { url: string; title: string; rss_url?: string | null } | null;
    joined: boolean;
};

/** 参加欄に出す自分のサイトと、そのリングに参加済み（申請中を含む）か */
export const getJoinContext = async (
    db: D1Database,
    did: string,
    ringUri: string,
): Promise<JoinContext> => {
    const [site, existing] = await Promise.all([
        db
            .prepare(
                "SELECT url, title, rss_url FROM sites WHERE user_did = ? LIMIT 1",
            )
            .bind(did)
            .first<JoinContext["site"]>(),
        db
            .prepare(`
            SELECT 1 FROM memberships m
            JOIN sites s ON m.site_id = s.id
            WHERE m.ring_uri = ? AND s.user_did = ? AND m.status = 'approved'
            UNION ALL
            SELECT 1 FROM join_requests WHERE ring_uri = ? AND user_did = ? AND status = 'pending'
            LIMIT 1
        `)
            .bind(ringUri, did, ringUri, did)
            .first(),
    ]);
    return { site: site ?? null, joined: !!existing };
};
