import type { SqliteDatabaseInterface } from "../types/db.js";

export class NavigationService {
    constructor(private db: SqliteDatabaseInterface) {}

    async getRandomSite(ringUri?: string): Promise<string | null> {
        let query = "SELECT url FROM sites WHERE is_active = 1";
        const params: any[] = [];

        if (ringUri) {
            query = `
                SELECT s.url 
                FROM sites s
                JOIN memberships m ON s.id = m.site_id
                WHERE m.ring_uri = ? AND s.is_active = 1 AND m.status = 'approved'
            `;
            params.push(ringUri);
        }

        query += " ORDER BY RANDOM() LIMIT 1";

        const site = await this.db
            .prepare(query)
            .bind(...params)
            .first<{ url: string }>();
        return site?.url || null;
    }

    async getNextSite(
        ringUri: string,
        fromUrl: string,
    ): Promise<string | null> {
        const members = await this.getMembers(ringUri);
        if (members.length === 0) return null;

        const currentIndex = members.findIndex((m) => m.url === fromUrl);
        if (currentIndex === -1) return members[0].url;

        const nextIndex = (currentIndex + 1) % members.length;
        return members[nextIndex].url;
    }

    async getPrevSite(
        ringUri: string,
        fromUrl: string,
    ): Promise<string | null> {
        const members = await this.getMembers(ringUri);
        if (members.length === 0) return null;

        const currentIndex = members.findIndex((m) => m.url === fromUrl);
        if (currentIndex === -1) return members[members.length - 1].url;

        const prevIndex = (currentIndex - 1 + members.length) % members.length;
        return members[prevIndex].url;
    }

    private async getMembers(ringUri: string): Promise<{ url: string }[]> {
        const res = await this.db
            .prepare(`
            SELECT s.url
            FROM sites s
            JOIN memberships m ON s.id = m.site_id
            WHERE m.ring_uri = ? AND s.is_active = 1 AND m.status = 'approved'
            ORDER BY m.created_at ASC
        `)
            .bind(ringUri)
            .all<{ url: string }>();
        return res.results;
    }
}
