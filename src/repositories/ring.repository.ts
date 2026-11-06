import { AtUri } from "@atproto/api";
import type { Ring } from "../types/db.js";

/** キャッシュに取り込むリングレコードの項目 (PDS が正本) */
export interface RingRecordFields {
    title: string;
    description?: string;
    admin?: string;
    status?: string;
    acceptancePolicy?: string;
    slug?: string;
    bannerUrl?: string;
    createdAt?: string;
}

export class RingRepository {
    constructor(private db: D1Database) {}

    async findByUri(uri: string): Promise<Ring | null> {
        return await this.db
            .prepare("SELECT * FROM rings WHERE uri = ?")
            .bind(uri)
            .first<Ring>();
    }

    async findBySlug(slug: string): Promise<Ring | null> {
        return await this.db
            .prepare("SELECT * FROM rings WHERE slug = ?")
            .bind(slug)
            .first<Ring>();
    }

    async findByUriWithMemberCount(uri: string): Promise<Ring | null> {
        return await this.db
            .prepare(
                `SELECT r.*, 
                (SELECT COUNT(*) FROM memberships m WHERE m.ring_uri = r.uri AND m.status = 'approved') as member_count 
                FROM rings r WHERE r.uri = ?`,
            )
            .bind(uri)
            .first<Ring>();
    }

    async updateBannerUrl(
        uri: string,
        bannerUrl: string | null,
    ): Promise<void> {
        await this.db
            .prepare("UPDATE rings SET banner_url = ? WHERE uri = ?")
            .bind(bannerUrl, uri)
            .run();
    }

    async updateMembershipBannerUrl(
        memberUri: string,
        bannerUrl: string | null,
    ): Promise<void> {
        await this.db
            .prepare(
                "UPDATE memberships SET banner_url = ? WHERE member_uri = ?",
            )
            .bind(bannerUrl, memberUri)
            .run();
    }

    async updateSettings(
        uri: string,
        data: Partial<
            Pick<
                Ring,
                | "title"
                | "description"
                | "status"
                | "acceptance_policy"
                | "slug"
            >
        >,
    ): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(data)) {
            fields.push(
                `${
                    key === "acceptance_policy" ? "acceptance_policy" : key
                } = ?`,
            );
            values.push(value);
        }

        if (fields.length === 0) return;

        values.push(uri);
        const query = `UPDATE rings SET ${fields.join(", ")} WHERE uri = ?`;
        await this.db
            .prepare(query)
            .bind(...values)
            .run();
    }

    async getOwnerDid(uri: string): Promise<string | null> {
        const ring = await this.db
            .prepare("SELECT owner_did FROM rings WHERE uri = ?")
            .bind(uri)
            .first<{ owner_did: string }>();
        return ring?.owner_did || null;
    }

    async getAllWithMemberCount(options?: {
        onlyOpen?: boolean;
    }): Promise<Ring[]> {
        let query =
            "SELECT r.*, (SELECT COUNT(*) FROM memberships m WHERE m.ring_uri = r.uri AND m.status = 'approved') as member_count FROM rings r";
        if (options?.onlyOpen) {
            query += " WHERE r.status = 'open'";
        }
        const res = await this.db.prepare(query).all<Ring>();
        return res.results;
    }

    async findJoinRequestsByAdmin(did: string): Promise<any[]> {
        const res = await this.db
            .prepare(`
            SELECT jr.*, r.title as ring_title 
            FROM join_requests jr 
            JOIN rings r ON jr.ring_uri = r.uri 
            WHERE (r.owner_did = ? OR r.admin_did = ?) AND jr.status = 'pending'
            GROUP BY jr.ring_uri, jr.user_did
        `)
            .bind(did, did)
            .all();
        return res.results;
    }

    async findBlocksByAdmin(did: string): Promise<any[]> {
        const res = await this.db
            .prepare(`
            SELECT b.*, r.title as ring_title, u.handle as user_handle
            FROM block_records b
            JOIN rings r ON b.ring_uri = r.uri
            LEFT JOIN users u ON b.subject_did = u.did
            WHERE r.owner_did = ? OR r.admin_did = ?
        `)
            .bind(did, did)
            .all();
        return res.results;
    }

    async findPendingMembershipsByAdmin(did: string): Promise<any[]> {
        const res = await this.db
            .prepare(`
            SELECT m.member_uri, s.title as site_title, s.url as site_url, r.title as ring_title 
            FROM memberships m 
            JOIN sites s ON m.site_id = s.id 
            JOIN rings r ON m.ring_uri = r.uri 
            WHERE (r.owner_did = ? OR r.admin_did = ?) AND m.status = 'pending'
            GROUP BY m.ring_uri, s.id
        `)
            .bind(did, did)
            .all();
        return res.results;
    }

    async findApprovedMembershipsByAdmin(did: string): Promise<any[]> {
        const res = await this.db
            .prepare(`
            SELECT m.member_uri, m.ring_uri, s.title as site_title, s.url as site_url, r.title as ring_title 
            FROM memberships m 
            JOIN sites s ON m.site_id = s.id 
            JOIN rings r ON m.ring_uri = r.uri 
            WHERE s.user_did = ? AND m.status = 'approved'
        `)
            .bind(did)
            .all();
        return res.results;
    }

    /**
     * リングレコード (PDS) の内容でキャッシュ行を作成・更新する。
     *
     * INSERT OR REPLACE は行を丸ごと置き換えるため使わない。レコードに
     * slug / bannerUrl がなければ既存の値を保つ。他のリングが使っている
     * slug は取らない (先着優先)。
     */
    async upsertFromRecord(uri: string, record: RingRecordFields) {
        const ownerDid = new AtUri(uri).hostname;
        const slug =
            record.slug && !(await this.isSlugTaken(record.slug, uri))
                ? record.slug
                : null;
        const createdAt = record.createdAt
            ? Math.floor(Date.parse(record.createdAt) / 1000)
            : null;

        await this.db
            .prepare(`
            INSERT INTO rings (uri, owner_did, admin_did, title, description,
                acceptance_policy, status, slug, banner_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%s', 'now')))
            ON CONFLICT(uri) DO UPDATE SET
                owner_did = excluded.owner_did,
                admin_did = excluded.admin_did,
                title = excluded.title,
                description = excluded.description,
                acceptance_policy = excluded.acceptance_policy,
                status = excluded.status,
                slug = COALESCE(excluded.slug, rings.slug),
                banner_url = COALESCE(excluded.banner_url, rings.banner_url),
                created_at = COALESCE(?, rings.created_at)
        `)
            .bind(
                uri,
                ownerDid,
                record.admin || ownerDid,
                record.title,
                record.description || null,
                record.acceptancePolicy || "automatic",
                record.status || "open",
                slug,
                record.bannerUrl || null,
                createdAt,
                createdAt,
            )
            .run();
    }

    /** 他のリングがすでに slug を使っているか */
    async isSlugTaken(slug: string, exceptUri: string): Promise<boolean> {
        const hit = await this.db
            .prepare("SELECT 1 FROM rings WHERE slug = ? AND uri != ? LIMIT 1")
            .bind(slug, exceptUri)
            .first();
        return !!hit;
    }

    async saveRing(
        uri: string,
        ownerDid: string,
        title: string,
        description: string | null,
    ): Promise<void> {
        await this.db
            .prepare(
                "INSERT OR IGNORE INTO rings (uri, owner_did, title, description) VALUES (?, ?, ?, ?)",
            )
            .bind(uri, ownerDid, title, description)
            .run();
    }
}
