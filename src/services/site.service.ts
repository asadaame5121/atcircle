import type { Agent } from "@atproto/api";
import { logger as pinoLogger } from "../lib/logger.js";
import type { Site } from "../types/db.js";
import {
    AtProtoService,
    type AtpRecordView,
    type SiteFields,
    type SiteRecordValue,
} from "./atproto.js";

/**
 * サイト登録。PDS の site レコード (net.asadaame5121.at-circle.site) が正本で、
 * DB の sites テーブルはキャッシュ (RSS アンテナ・説明文の表示などで使う)。
 *
 * いまのアプリは 1 人 1 サイトとして扱い、最も古い site レコードを使う。
 * レコードのキーは tid なので、将来は複数サイトに広げられる。
 */
export class SiteService {
    constructor(private readonly db: D1Database) {}

    /** 自分のサイト。PDS を優先し、読めなければ DB のキャッシュ */
    async getMySite(agent: Agent | null, did: string): Promise<Site | null> {
        if (agent) {
            try {
                const [primary] = await AtProtoService.listSites(agent);
                if (primary) return await this.cache(did, primary);
            } catch (e) {
                pinoLogger.warn({
                    msg: "[SiteService] Could not read site records; using DB",
                    did,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }
        return await this.findCached(did);
    }

    /**
     * 登録・更新。先に PDS に書き、成功したら DB を更新する。
     * PDS に書けなければ例外を投げ、DB は変えない。
     */
    async saveMySite(
        agent: Agent,
        did: string,
        fields: SiteFields,
    ): Promise<Site> {
        const uri = await this.currentSiteUri(agent, did);
        const ref = await AtProtoService.putSite(agent, {
            ...fields,
            ...(uri ? { uri } : {}),
        });
        return await this.cache(did, {
            uri: ref.uri,
            cid: ref.cid,
            value: fields,
        });
    }

    /**
     * 移行用: DB にだけある登録から site レコードを作る。
     * すでに PDS にあれば DB と結び付けるだけ。
     */
    async migrateSite(
        agent: Agent,
        did: string,
    ): Promise<"created" | "linked" | "none"> {
        const [primary] = await AtProtoService.listSites(agent);
        if (primary) {
            await this.cache(did, primary);
            return "linked";
        }
        const legacy = await this.findCached(did);
        if (!legacy) return "none";

        const ref = await AtProtoService.putSite(agent, {
            url: legacy.url,
            title: legacy.title,
            description: legacy.description,
            rss: legacy.rss_url,
        });
        await this.db
            .prepare("UPDATE sites SET site_uri = ? WHERE id = ?")
            .bind(ref.uri, legacy.id)
            .run();
        return "created";
    }

    private async currentSiteUri(
        agent: Agent,
        did: string,
    ): Promise<string | undefined> {
        const cached = await this.findCached(did);
        if (cached?.site_uri) return cached.site_uri;
        const [primary] = await AtProtoService.listSites(agent);
        return primary?.uri;
    }

    private async findCached(did: string): Promise<Site | null> {
        return await this.db
            .prepare(
                "SELECT * FROM sites WHERE user_did = ? AND is_active = 1 ORDER BY id LIMIT 1",
            )
            .bind(did)
            .first<Site>();
    }

    /** PDS の内容で DB の行を更新する (なければ作る)。1 人 1 行を保つ */
    private async cache(
        did: string,
        record: AtpRecordView<SiteRecordValue>,
    ): Promise<Site> {
        const v = record.value;
        const values = [
            v.url,
            v.title,
            v.description || null,
            v.rss || null,
            record.uri,
        ];
        const existing = await this.findCached(did);
        if (existing) {
            await this.db
                .prepare(
                    "UPDATE sites SET url = ?, title = ?, description = ?, rss_url = ?, site_uri = ? WHERE id = ?",
                )
                .bind(...values, existing.id)
                .run();
        } else {
            await this.db
                .prepare(
                    "INSERT INTO sites (url, title, description, rss_url, site_uri, user_did, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
                )
                .bind(...values, did)
                .run();
        }
        return (await this.findCached(did)) as Site;
    }
}
