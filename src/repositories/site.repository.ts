import type { Site, SqliteDatabaseInterface } from "../types/db.js";

export class SiteRepository {
    constructor(private db: SqliteDatabaseInterface) {}

    async findFirstByUserDid(did: string): Promise<Site | null> {
        return await this.db
            .prepare("SELECT * FROM sites WHERE user_did = ? AND is_active = 1")
            .bind(did)
            .first<Site>();
    }

    async findAllByUserDid(did: string): Promise<Site[]> {
        const res = await this.db
            .prepare("SELECT * FROM sites WHERE user_did = ? AND is_active = 1")
            .bind(did)
            .all<Site>();
        return res.results;
    }

    async create(data: {
        user_did: string;
        url: string;
        title: string;
        description?: string;
        rss_url?: string;
    }): Promise<void> {
        await this.db
            .prepare(
                "INSERT INTO sites (user_did, url, title, description, rss_url) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(
                data.user_did,
                data.url,
                data.title,
                data.description || null,
                data.rss_url || null,
            )
            .run();
    }
}
