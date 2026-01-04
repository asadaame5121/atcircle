import type { Ring, SqliteDatabaseInterface } from "../types/db.js";

export class RingRepository {
    constructor(private db: SqliteDatabaseInterface) {}

    async findByUri(uri: string): Promise<Ring | null> {
        return await this.db
            .prepare("SELECT * FROM rings WHERE uri = ?")
            .bind(uri)
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

    async getAllWithMemberCount(): Promise<Ring[]> {
        const res = await this.db
            .prepare(
                "SELECT r.*, (SELECT COUNT(*) FROM memberships m WHERE m.ring_uri = r.uri AND m.status = 'approved') as member_count FROM rings r",
            )
            .all<Ring>();
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
