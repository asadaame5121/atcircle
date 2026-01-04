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
