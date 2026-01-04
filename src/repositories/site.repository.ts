import type { Site, SqliteDatabaseInterface } from "../types/db.js";

export class SiteRepository {
    constructor(private db: SqliteDatabaseInterface) {}

    async findByUserDid(did: string): Promise<Site | null> {
        return await this.db
            .prepare("SELECT * FROM sites WHERE user_did = ?")
            .bind(did)
            .first<Site>();
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
