import { getApprovedMembers } from "./ring-members.js";

export class NavigationService {
    constructor(private db: D1Database) {}

    async getRandomSite(ringUri?: string): Promise<string | null> {
        if (ringUri) {
            const members = await this.getMembers(ringUri);
            if (members.length === 0) return null;
            return members[Math.floor(Math.random() * members.length)].url;
        }

        // リング指定なし: 全サイトから (DB のキャッシュ)
        const site = await this.db
            .prepare(
                "SELECT url FROM sites WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1",
            )
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

    /** 承認済みメンバー (参加順)。PDS が正本で、取れなければ DB のキャッシュ */
    private async getMembers(ringUri: string): Promise<{ url: string }[]> {
        const { members } = await getApprovedMembers(this.db, ringUri);
        return members;
    }
}
