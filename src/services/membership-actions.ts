import type { Agent } from "@atproto/api";
import { AtProtoService, type DecisionStatus } from "./atproto.js";
import { publicRecords } from "./public-records.js";
import { ringIndex } from "./ring-index.js";

/**
 * 管理者による参加状態の変更。PDS (decision レコード) が正本で、
 * ローカル DB の更新は呼び出し側がキャッシュとして行う。
 */
export const MembershipActions = {
    /** 対象レコード (member / request) に判断を記録する */
    async decide(
        agent: Agent,
        ringUri: string,
        subjectUri: string,
        status: DecisionStatus,
    ) {
        // strongRef には CID が要る
        const subject = await publicRecords.getRecord(subjectUri);
        if (!subject) {
            throw new Error(`Membership record not found: ${subjectUri}`);
        }
        await AtProtoService.putDecision(
            agent,
            ringUri,
            { uri: subject.uri, cid: subject.cid },
            status,
        );
        ringIndex.invalidate(ringUri);
    },

    /** 判断を取り消して保留 (要承認リング) / 承認 (自動承認リング) に戻す */
    async reset(agent: Agent, ringUri: string, subjectUri: string) {
        await AtProtoService.deleteDecisions(agent, ringUri, subjectUri);
        ringIndex.invalidate(ringUri);
    },

    /**
     * 移行用: DB にだけ記録されている承認・停止を decision として PDS に書く。
     * PDS 上の状態と DB の状態が食い違う参加だけを対象にする。
     * PDS の一覧が取れないリングは、誤って上書きしないよう飛ばす。
     * 書いた件数を返す。
     */
    async backfillDecisions(
        db: D1Database,
        agent: Agent,
        ringUris: string[],
    ): Promise<number> {
        let written = 0;
        for (const ringUri of ringUris) {
            let pdsStatus: Map<string, string>;
            try {
                const view = await ringIndex.getMemberships(ringUri);
                if (!view) continue;
                pdsStatus = new Map(
                    view.memberships.map((m) => [m.subjectUri, m.status]),
                );
            } catch {
                continue;
            }

            const rows = await db
                .prepare(
                    "SELECT member_uri, status FROM memberships WHERE ring_uri = ? AND status IN ('approved', 'suspended')",
                )
                .bind(ringUri)
                .all<{
                    member_uri: string;
                    status: "approved" | "suspended";
                }>();

            for (const row of rows.results ?? []) {
                if (!row.member_uri?.startsWith("at://")) continue;
                if (pdsStatus.get(row.member_uri) === row.status) continue;
                try {
                    await MembershipActions.decide(
                        agent,
                        ringUri,
                        row.member_uri,
                        row.status,
                    );
                    written++;
                } catch {
                    // 参加レコードが消えているなど。個別の失敗は飛ばす
                }
            }
        }
        return written;
    },

    /**
     * ある DID のこのリングでの参加レコード (member / request) の URI。
     * PDS の一覧を優先し、取れなければ DB のキャッシュを使う。
     */
    async findSubjects(
        db: D1Database,
        ringUri: string,
        did: string,
    ): Promise<string[]> {
        try {
            const view = await ringIndex.getMemberships(ringUri);
            const fromPds =
                view?.memberships
                    .filter((m) => m.did === did)
                    .map((m) => m.subjectUri) ?? [];
            if (fromPds.length > 0) return fromPds;
        } catch {
            // DB にフォールバック
        }
        const res = await db
            .prepare(`
                SELECT m.member_uri FROM memberships m
                JOIN sites s ON s.id = m.site_id
                WHERE m.ring_uri = ? AND s.user_did = ?
            `)
            .bind(ringUri, did)
            .all<{ member_uri: string }>();
        return (res.results ?? [])
            .map((r) => r.member_uri)
            .filter((uri) => uri?.startsWith("at://"));
    },
};
