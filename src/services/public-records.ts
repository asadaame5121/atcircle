import { AtUri } from "@atproto/api";
import {
    CONSTELLATION_URL,
    PLC_DIRECTORY_URL,
    SLINGSHOT_URL,
} from "../config.js";

/**
 * 公開 ATProto レコードの読み取り。
 *
 * - レコード本体: Slingshot (任意リポジトリの getRecord をキャッシュ付きで中継)。
 *   Slingshot が使えないときは DID ドキュメントから PDS を引いて直接読む。
 * - 逆引き: Constellation のバックリンク (あるリングを参照するレコード一覧)。
 *
 * ローカル DB を正本にしないための土台。結果は短時間だけメモリにキャッシュする。
 */

export interface RecordView<T = Record<string, unknown>> {
    uri: string;
    cid: string;
    value: T;
}

export interface PublicRecordsOptions {
    slingshotUrl?: string;
    constellationUrl?: string;
    plcUrl?: string;
    fetch?: typeof fetch;
    /** レコードのキャッシュ時間 (ms) */
    recordTtlMs?: number;
    /** バックリンクのキャッシュ時間 (ms) */
    backlinkTtlMs?: number;
    timeoutMs?: number;
}

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

const MAX_BACKLINK_PAGES = 20; // 100 件 × 20 ページ = 2,000 件まで
const MAX_CACHE_ENTRIES = 5_000;

export class PublicRecords {
    private readonly slingshotUrl: string;
    private readonly constellationUrl: string;
    private readonly plcUrl: string;
    private readonly fetchFn: typeof fetch;
    private readonly recordTtlMs: number;
    private readonly backlinkTtlMs: number;
    private readonly timeoutMs: number;

    private readonly records = new Map<string, CacheEntry<RecordView | null>>();
    private readonly backlinks = new Map<string, CacheEntry<string[]>>();
    private readonly pdsEndpoints = new Map<string, CacheEntry<string>>();

    constructor(options: PublicRecordsOptions = {}) {
        this.slingshotUrl = options.slingshotUrl ?? SLINGSHOT_URL;
        this.constellationUrl = options.constellationUrl ?? CONSTELLATION_URL;
        this.plcUrl = options.plcUrl ?? PLC_DIRECTORY_URL;
        this.fetchFn =
            options.fetch ??
            (process.env.VITEST
                ? // 単体テストから外部の公開インデックスへ出ていかないようにする。
                  // 必要なテストは fetch を渡すかスパイで差し替える。
                  () =>
                      Promise.reject(
                          new Error("Network access is disabled in tests"),
                      )
                : (input, init) => globalThis.fetch(input, init));
        this.recordTtlMs = options.recordTtlMs ?? 60_000;
        this.backlinkTtlMs = options.backlinkTtlMs ?? 30_000;
        this.timeoutMs = options.timeoutMs ?? 8_000;
    }

    /**
     * レコードを取得する。存在しなければ null。
     * Slingshot と PDS の両方に到達できなければ例外を投げる。
     */
    async getRecord<T = Record<string, unknown>>(
        uri: string,
    ): Promise<RecordView<T> | null> {
        const cached = this.fromCache(this.records, uri);
        if (cached !== undefined) return cached as RecordView<T> | null;

        const { repo, collection, rkey } = parseAtUri(uri);
        const query = new URLSearchParams({ repo, collection, rkey });

        let result: RecordView | null;
        try {
            result = await this.fetchRecord(
                `${this.slingshotUrl}/xrpc/com.atproto.repo.getRecord?${query}`,
            );
        } catch {
            const pds = await this.resolvePds(repo);
            result = await this.fetchRecord(
                `${pds}/xrpc/com.atproto.repo.getRecord?${query}`,
            );
        }

        this.toCache(this.records, uri, result, this.recordTtlMs);
        return result as RecordView<T> | null;
    }

    /**
     * subject を path で参照している collection のレコード URI 一覧。
     * 例: getBacklinks(ringUri, "net.asadaame5121.at-circle.member", "ring.uri")
     */
    async getBacklinks(
        subject: string,
        collection: string,
        path: string,
    ): Promise<string[]> {
        const source = `${collection}:${path}`;
        const key = `${subject}\n${source}`;
        const cached = this.fromCache(this.backlinks, key);
        if (cached !== undefined) return cached;

        const uris: string[] = [];
        let cursor: string | null = null;
        for (let page = 0; page < MAX_BACKLINK_PAGES; page++) {
            const query = new URLSearchParams({
                subject,
                source,
                limit: "100",
            });
            if (cursor) query.set("cursor", cursor);
            const res = await this.request(
                `${this.constellationUrl}/xrpc/blue.microcosm.links.getBacklinks?${query}`,
            );
            if (!res.ok) {
                throw new Error(`Constellation responded ${res.status}`);
            }
            const body = (await res.json()) as {
                records?: { did: string; collection: string; rkey: string }[];
                cursor?: string | null;
            };
            for (const r of body.records ?? []) {
                uris.push(`at://${r.did}/${r.collection}/${r.rkey}`);
            }
            cursor = body.cursor ?? null;
            if (!cursor) break;
        }

        this.toCache(this.backlinks, key, uris, this.backlinkTtlMs);
        return uris;
    }

    /** 書き込み後に古い結果を返さないよう、キャッシュを捨てる。 */
    invalidate(uri?: string) {
        if (!uri) {
            this.records.clear();
            this.backlinks.clear();
            return;
        }
        this.records.delete(uri);
        for (const key of this.backlinks.keys()) {
            if (key.startsWith(`${uri}\n`)) this.backlinks.delete(key);
        }
    }

    private async fetchRecord(url: string): Promise<RecordView | null> {
        const res = await this.request(url);
        if (res.ok) {
            const body = (await res.json()) as RecordView;
            if (!body?.uri || !body.cid || !body.value) {
                throw new Error("Malformed getRecord response");
            }
            return { uri: body.uri, cid: body.cid, value: body.value };
        }
        // 存在しないレコードは 400 (RecordNotFound) で返る
        if (res.status === 400 || res.status === 404) {
            const body = (await res.json().catch(() => ({}))) as {
                error?: string;
            };
            if (body.error === "RecordNotFound" || res.status === 404) {
                return null;
            }
        }
        throw new Error(`getRecord responded ${res.status}`);
    }

    private async resolvePds(did: string): Promise<string> {
        const cached = this.fromCache(this.pdsEndpoints, did);
        if (cached) return cached;

        let docUrl: string;
        if (did.startsWith("did:plc:")) {
            docUrl = `${this.plcUrl}/${did}`;
        } else if (did.startsWith("did:web:")) {
            const host = decodeURIComponent(did.slice("did:web:".length));
            docUrl = `https://${host}/.well-known/did.json`;
        } else {
            throw new Error(`Unsupported DID method: ${did}`);
        }

        const res = await this.request(docUrl);
        if (!res.ok) throw new Error(`DID resolution failed: ${res.status}`);
        const doc = (await res.json()) as {
            service?: {
                id?: string;
                type?: string;
                serviceEndpoint?: string;
            }[];
        };
        const pds = doc.service?.find(
            (s) =>
                s.type === "AtprotoPersonalDataServer" ||
                s.id === "#atproto_pds",
        )?.serviceEndpoint;
        if (!pds || !/^https?:\/\//.test(pds)) {
            throw new Error(`No PDS endpoint for ${did}`);
        }
        const endpoint = pds.replace(/\/$/, "");
        this.toCache(this.pdsEndpoints, did, endpoint, 60 * 60_000);
        return endpoint;
    }

    private request(url: string): Promise<Response> {
        return this.fetchFn(url, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(this.timeoutMs),
        });
    }

    private fromCache<T>(map: Map<string, CacheEntry<T>>, key: string) {
        const entry = map.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt <= Date.now()) {
            map.delete(key);
            return undefined;
        }
        return entry.value;
    }

    private toCache<T>(
        map: Map<string, CacheEntry<T>>,
        key: string,
        value: T,
        ttlMs: number,
    ) {
        if (map.size >= MAX_CACHE_ENTRIES) {
            const oldest = map.keys().next().value;
            if (oldest !== undefined) map.delete(oldest);
        }
        map.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
}

export const parseAtUri = (uri: string) => {
    if (!uri.startsWith("at://")) throw new Error(`Not an AT URI: ${uri}`);
    const parsed = new AtUri(uri);
    if (!parsed.hostname || !parsed.collection || !parsed.rkey) {
        throw new Error(`Incomplete AT URI: ${uri}`);
    }
    return {
        repo: parsed.hostname,
        collection: parsed.collection,
        rkey: parsed.rkey,
    };
};

/** アプリ全体で共有するインスタンス */
export const publicRecords = new PublicRecords();
