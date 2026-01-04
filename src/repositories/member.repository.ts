import type { SqliteDatabaseInterface } from "../types/db.js";

export interface Member {
    id: number;
    user_did: string;
    url: string;
    title: string;
    rss_url: string | null;
    description: string | null;
    is_active: number;
    member_uri: string;
    status: string;
    created_at: string;
    widget_installed: number;
}

export class MemberRepository {
    constructor(private db: SqliteDatabaseInterface) {}

    async findApprovedMembersByRing(ringUri: string): Promise<Member[]> {
        const res = await this.db
            .prepare(`
            SELECT s.*, m.member_uri, m.status, m.created_at
            FROM sites s
            JOIN memberships m ON s.id = m.site_id
            WHERE m.ring_uri = ? AND s.is_active = 1 AND m.status = 'approved'
            GROUP BY s.id
            ORDER BY m.created_at ASC
        `)
            .bind(ringUri)
            .all<Member>();
        return res.results;
    }

    async findMembersForOpml(ringUri: string): Promise<Member[]> {
        const res = await this.db
            .prepare(`
            SELECT s.title, s.url, s.rss_url, s.description
            FROM sites s
            JOIN memberships m ON s.id = m.site_id
            WHERE m.ring_uri = ? AND s.is_active = 1 AND s.rss_url IS NOT NULL
            GROUP BY s.id
        `)
            .bind(ringUri)
            .all<Member>();
        return res.results;
    }
}
