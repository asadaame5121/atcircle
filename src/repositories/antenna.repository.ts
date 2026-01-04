import type { SqliteDatabaseInterface } from "../types/db.js";

export interface AntennaItem {
    item_title: string;
    item_url: string;
    published_at: number;
    site_title: string;
    site_url: string;
}

export class AntennaRepository {
    constructor(private db: SqliteDatabaseInterface) {}

    async findItemsByRing(ringUri: string, limit = 50): Promise<AntennaItem[]> {
        const res = await this.db
            .prepare(`
            SELECT 
                ai.title as item_title, 
                ai.url as item_url, 
                ai.published_at, 
                s.title as site_title, 
                s.url as site_url 
            FROM antenna_items ai
            JOIN sites s ON ai.site_id = s.id
            WHERE s.is_active = 1 AND EXISTS (
                SELECT 1 FROM memberships m 
                WHERE m.site_id = s.id AND m.ring_uri = ? AND m.status = 'approved'
            )
            ORDER BY ai.published_at DESC
            LIMIT ?
        `)
            .bind(ringUri, limit)
            .all<AntennaItem>();
        return res.results;
    }

    async findAllItems(limit = 50): Promise<AntennaItem[]> {
        const res = await this.db
            .prepare(`
            SELECT 
                ai.title as item_title, 
                ai.url as item_url, 
                ai.published_at, 
                s.title as site_title, 
                s.url as site_url 
            FROM antenna_items ai
            JOIN sites s ON ai.site_id = s.id
            WHERE s.is_active = 1
            ORDER BY ai.published_at DESC
            LIMIT ?
        `)
            .bind(limit)
            .all<AntennaItem>();
        return res.results;
    }
}
