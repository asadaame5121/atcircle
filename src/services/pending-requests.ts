import { ringIndex } from "./ring-index.js";

/**
 * 管理しているリングの承認待ち一覧を作る。
 *
 * PDS から一覧が取れたリングは PDS の「保留」を使う (他のクライアントからの
 * 申請も含む)。取れなかったリングだけ DB のキャッシュの行を残す。
 * PDS 由来の項目は subject_uri を持ち、承認・拒否は ring_uri + subject_uri で行う。
 */
export async function collectPendingRequests(
    managedRings: { uri: string; title: string }[],
    dbJoinRequests: any[],
    dbPendingMemberships: any[],
): Promise<{ joinRequests: any[]; pendingMemberships: any[] }> {
    const fromPds: any[] = [];
    const resolved = new Set<string>();

    await Promise.all(
        managedRings.map(async (ring) => {
            try {
                const view = await ringIndex.getMemberships(ring.uri);
                if (!view) return;
                resolved.add(ring.uri);
                for (const m of view.memberships) {
                    if (m.status !== "pending") continue;
                    fromPds.push({
                        ring_uri: ring.uri,
                        ring_title: ring.title,
                        subject_uri: m.subjectUri,
                        user_did: m.did,
                        site_title: m.title,
                        site_url: m.url,
                        message: m.note ?? null,
                    });
                }
            } catch {
                // このリングは DB のキャッシュを使う
            }
        }),
    );

    // 並列取得の順序に依存しないよう、リングの並び順に揃える
    const order = new Map(managedRings.map((r, i) => [r.uri, i]));
    fromPds.sort(
        (a, b) => (order.get(a.ring_uri) ?? 0) - (order.get(b.ring_uri) ?? 0),
    );

    return {
        joinRequests: [
            ...dbJoinRequests.filter((jr) => !resolved.has(jr.ring_uri)),
            ...fromPds,
        ],
        pendingMemberships: dbPendingMemberships.filter(
            (pm) => !resolved.has(pm.ring_uri),
        ),
    };
}
