import type { SiteRepository } from "../repositories/site.repository.js";
import type { SqliteDatabaseInterface } from "../types/db.js";
import { AtProtoService } from "./atproto.js";

export interface ProfileData {
    handle: string;
    did: string;
    sites: any[];
    memberships: any[];
}

export class ProfileService {
    constructor(
        private siteRepo: SiteRepository,
        private db: SqliteDatabaseInterface,
    ) {}

    async getProfileData(handle: string): Promise<ProfileData | null> {
        // 1. Resolve handle to DID
        let did = handle;
        if (!handle.startsWith("did:")) {
            const resolved = await AtProtoService.resolveHandle(handle);
            if (!resolved) return null;
            did = resolved;
        }

        // 2. Fetch user's sites
        const sites = await this.siteRepo.findAllByUserDid(did);

        // 3. Fetch user's webrings (where they are a member)
        const resMemberships = await this.db
            .prepare(`
            SELECT r.uri, r.title, r.description, m.status, r.slug
            FROM memberships m
            JOIN rings r ON m.ring_uri = r.uri
            WHERE m.site_id IN (SELECT id FROM sites WHERE user_did = ?) AND m.status = 'approved'
        `)
            .bind(did)
            .all<any>();
        const memberships = resMemberships.results || [];

        return {
            handle,
            did,
            sites,
            memberships,
        };
    }
}
