import { logger as pinoLogger } from "../lib/logger.js";
import { verifyWidget } from "./discovery.js";

const HOUR = 60 * 60;
const SEEN_GRACE = 7 * 24 * HOUR;

const nowSec = () => Math.floor(Date.now() / 1000);

const hostOf = (url: string): string | null => {
    try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        return u.hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return null;
    }
};

/** 2つの URL が同じサイトか（ホスト名で比べる。www・大文字小文字・パスは無視） */
export const sameSite = (a: string, b: string) => {
    const ha = hostOf(a);
    return !!ha && ha === hostOf(b);
};

type MemberRow = {
    id: number;
    ring_uri: string;
    url: string;
    widget_seen_at: number | null;
};

/**
 * ウィジェットが表示された（widget.js の通知）か、前へ・次へが押された（from）ことを記録する。
 * 送信元は確かめられないので「設置済み」の目安としてだけ使う。
 * アクセスのたびに書かないよう、1時間以内に記録済みならスキップする。
 * @returns そのリングの参加サイトに一致したか
 */
export async function markWidgetSeen(
    db: D1Database,
    ringUri: string,
    pageUrl: string,
    now = nowSec(),
): Promise<boolean> {
    if (!ringUri || !hostOf(pageUrl)) return false;
    const rows = await db
        .prepare(`
            SELECT m.id, m.ring_uri, s.url, m.widget_seen_at
            FROM memberships m JOIN sites s ON s.id = m.site_id
            WHERE m.ring_uri = ? AND m.status = 'approved'
        `)
        .bind(ringUri)
        .all<MemberRow>();
    const match = (rows.results ?? []).find((r) => sameSite(r.url, pageUrl));
    if (!match) return false;
    if (match.widget_seen_at && now - match.widget_seen_at < HOUR) return true;
    await db
        .prepare(
            "UPDATE memberships SET widget_installed = 1, widget_seen_at = ? WHERE id = ?",
        )
        .bind(now, match.id)
        .run();
    return true;
}

/**
 * 全参加サイトを取得してウィジェットの有無を確かめる（毎日の定期処理）。
 * 取得で見つからなくても、7日以内に表示を確認していれば設置済みのままにする
 * （JavaScript で描画するサイトは取得しても見つからないため）。
 */
export async function verifyAllWidgets(
    db: D1Database,
    options: {
        verify?: (url: string, ringUri: string) => Promise<boolean>;
        now?: number;
        concurrency?: number;
    } = {},
): Promise<{ checked: number; installed: number }> {
    const verify = options.verify ?? verifyWidget;
    const now = options.now ?? nowSec();
    const concurrency = options.concurrency ?? 4;

    const rows = await db
        .prepare(`
            SELECT m.id, m.ring_uri, s.url, m.widget_seen_at
            FROM memberships m JOIN sites s ON s.id = m.site_id
            WHERE m.status = 'approved'
        `)
        .all<MemberRow>();
    const queue = [...(rows.results ?? [])];
    let checked = 0;
    let installed = 0;

    const worker = async () => {
        for (let r = queue.shift(); r; r = queue.shift()) {
            let found = false;
            try {
                found = await verify(r.url, r.ring_uri);
            } catch (e) {
                pinoLogger.warn({
                    msg: "[WidgetCheck] verify failed",
                    url: r.url,
                    error: e,
                });
            }
            const recentlySeen =
                !!r.widget_seen_at && now - r.widget_seen_at <= SEEN_GRACE;
            const ok = found || recentlySeen;
            try {
                await db
                    .prepare(
                        "UPDATE memberships SET widget_installed = ?, last_verified_at = ? WHERE id = ?",
                    )
                    .bind(ok ? 1 : 0, now, r.id)
                    .run();
            } catch (e) {
                pinoLogger.error({
                    msg: "[WidgetCheck] update failed",
                    id: r.id,
                    error: e,
                });
            }
            checked++;
            if (ok) installed++;
        }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    return { checked, installed };
}

export type WidgetStatus = { checked: boolean; installed: boolean };

/** 自分のサイトの参加ごとのウィジェットの状態（リング URI → 状態） */
export async function getMyWidgetStatus(
    db: D1Database,
    did: string,
): Promise<Record<string, WidgetStatus>> {
    const rows = await db
        .prepare(`
            SELECT m.ring_uri, m.widget_installed, m.last_verified_at, m.widget_seen_at
            FROM memberships m JOIN sites s ON s.id = m.site_id
            WHERE s.user_did = ? AND m.status = 'approved'
        `)
        .bind(did)
        .all<any>();
    const out: Record<string, WidgetStatus> = {};
    for (const r of rows.results ?? []) {
        out[r.ring_uri] = {
            checked: !!(r.last_verified_at || r.widget_seen_at),
            installed: !!r.widget_installed,
        };
    }
    return out;
}
