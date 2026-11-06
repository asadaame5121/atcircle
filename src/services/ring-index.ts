import { AtUri } from "@atproto/api";
import {
    type BlockValue,
    type DecisionValue,
    type MemberValue,
    type RequestValue,
    type ResolvedMembership,
    resolveMemberships,
    trustedManagers,
} from "./membership.js";
import {
    type PublicRecords,
    publicRecords,
    type RecordView,
} from "./public-records.js";

const NS = "net.asadaame5121.at-circle";
export const COLLECTIONS = {
    ring: `${NS}.ring`,
    member: `${NS}.member`,
    request: `${NS}.request`,
    decision: `${NS}.decision`,
    block: `${NS}.block`,
} as const;

export interface RingValue {
    title: string;
    description?: string;
    admin?: string;
    status?: string;
    acceptancePolicy?: string;
    slug?: string;
    bannerUrl?: string;
    createdAt?: string;
}

export interface RingMembershipView {
    ring: RecordView<RingValue>;
    memberships: ResolvedMembership[];
}

const FETCH_CONCURRENCY = 8;

/**
 * リングの参加者一覧を、ローカル DB を使わずに組み立てる。
 *
 * 1. リングレコードを読む (所有者と admin が分かる)
 * 2. Constellation で、このリングを参照する member / request / decision /
 *    block レコードの URI を集める
 * 3. 各レコードを読み、resolveMemberships で状態を決める
 *
 * decision と block は管理者のものだけを読む。結果は短時間キャッシュする。
 */
export class RingIndex {
    private readonly cache = new Map<
        string,
        { value: RingMembershipView | null; expiresAt: number }
    >();

    constructor(
        private readonly records: PublicRecords = publicRecords,
        private readonly ttlMs = 30_000,
    ) {}

    async getMemberships(ringUri: string): Promise<RingMembershipView | null> {
        const hit = this.cache.get(ringUri);
        if (hit && hit.expiresAt > Date.now()) return hit.value;

        const value = await this.load(ringUri);
        this.cache.set(ringUri, {
            value,
            expiresAt: Date.now() + this.ttlMs,
        });
        return value;
    }

    /** このリングに関する書き込みの後に呼ぶ */
    invalidate(ringUri: string) {
        this.cache.delete(ringUri);
        this.records.invalidate(ringUri);
    }

    private async load(ringUri: string): Promise<RingMembershipView | null> {
        const ring = await this.records.getRecord<RingValue>(ringUri);
        if (!ring) return null;

        const trusted = trustedManagers(ringUri, ring.value);
        const byManager = (uri: string) => {
            try {
                return trusted.has(new AtUri(uri).hostname);
            } catch {
                return false;
            }
        };

        const [memberUris, requestUris, decisionUris, blockUris] =
            await Promise.all([
                this.records.getBacklinks(
                    ringUri,
                    COLLECTIONS.member,
                    "ring.uri",
                ),
                this.records.getBacklinks(
                    ringUri,
                    COLLECTIONS.request,
                    "ring.uri",
                ),
                this.records.getBacklinks(
                    ringUri,
                    COLLECTIONS.decision,
                    "ring.uri",
                ),
                this.records.getBacklinks(
                    ringUri,
                    COLLECTIONS.block,
                    "ring.uri",
                ),
            ]);

        const [members, requests, decisions, blocks] = await Promise.all([
            this.fetchAll<MemberValue>(memberUris),
            this.fetchAll<RequestValue>(requestUris),
            this.fetchAll<DecisionValue>(decisionUris.filter(byManager)),
            this.fetchAll<BlockValue>(blockUris.filter(byManager)),
        ]);

        return {
            ring,
            memberships: resolveMemberships({
                ringUri,
                ring: ring.value,
                members,
                requests,
                decisions,
                blocks,
            }),
        };
    }

    /** 並列数を抑えて読む。読めなかったレコード (削除済みなど) は飛ばす */
    private async fetchAll<T>(uris: string[]): Promise<RecordView<T>[]> {
        const out: RecordView<T>[] = [];
        let next = 0;
        const worker = async () => {
            while (next < uris.length) {
                const uri = uris[next++];
                try {
                    const rec = await this.records.getRecord<T>(uri);
                    if (rec) out.push(rec);
                } catch {
                    // 個々のレコードの失敗は全体を止めない
                }
            }
        };
        await Promise.all(
            Array.from(
                { length: Math.min(FETCH_CONCURRENCY, uris.length) },
                worker,
            ),
        );
        return out;
    }
}

export const ringIndex = new RingIndex();
