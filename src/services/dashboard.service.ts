import { AtUri } from "@atproto/api";
import { PUBLIC_URL } from "../config.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { SiteRepository } from "../repositories/site.repository.js";
import type { Site, SqliteDatabaseInterface } from "../types/db.js";
import { AtProtoService } from "./atproto.js";
import { fetchAndDiscoverMetadata } from "./discovery.js";
import { restoreAgent } from "./oauth.js";

export interface RegistrationData {
    type: "registration";
    discoveryStatus: string;
    detectedSites: { url: string; title?: string; rss?: string }[];
    defaultSite: { url: string; title?: string; rss?: string };
}

export interface DashboardViewData {
    type: "dashboard";
    site: Site;
    unifiedRings: any[];
    joinRequests: any[];
    pendingMemberships: any[];
    blocks: any[];
    did: string;
}

export class DashboardService {
    private ringRepo: RingRepository;
    private siteRepo: SiteRepository;

    constructor(private db: SqliteDatabaseInterface) {
        this.ringRepo = new RingRepository(db);
        this.siteRepo = new SiteRepository(db);
    }

    async getDashboardData(
        did: string,
    ): Promise<RegistrationData | DashboardViewData> {
        const agent = await restoreAgent(this.db as any, PUBLIC_URL, did);

        const site = await this.siteRepo.findFirstByUserDid(did);

        if (!site) {
            return {
                type: "registration",
                ...(await this.getDiscoveryData(did)),
            };
        }

        // Parallel fetching of ATProto data and local moderation data
        const [
            myRings,
            myMemberships,
            joinRequests,
            pendingMemberships,
            blocks,
            localRings,
        ] = await Promise.all([
            agent ? AtProtoService.listRings(agent, did) : Promise.resolve([]),
            agent
                ? AtProtoService.listMemberRecords(agent, did)
                : Promise.resolve([]),
            this.ringRepo.findJoinRequestsByAdmin(did),
            this.ringRepo.findPendingMembershipsByAdmin(did),
            this.ringRepo.findBlocksByAdmin(did),
            this.ringRepo.getAllWithMemberCount(),
        ]);

        // Unified Rings Logic
        const ringMap = new Map<string, any>();
        for (const r of myRings) {
            ringMap.set(r.uri, {
                uri: r.uri,
                title: r.value.title,
                description: r.value.description || "",
                status: r.value.status || "open",
                isAdmin: true,
                isMember: false,
                slug: r.value.slug || "",
                adminDid: r.value.admin || did,
                acceptancePolicy: r.value.acceptancePolicy || "automatic",
                pendingCount: 0,
            });
        }

        for (const m of myMemberships) {
            const ringUri = m.value.ring.uri;
            const existing = ringMap.get(ringUri);
            if (existing) {
                existing.isMember = true;
                existing.memberUri = m.uri;
                existing.siteUrl = m.value.url;
            } else {
                try {
                    const ringAtUri = new AtUri(ringUri);
                    if (ringAtUri.hostname === did) continue;
                } catch {}

                ringMap.set(ringUri, {
                    uri: ringUri,
                    title: "Loading...",
                    isMember: true,
                    memberUri: m.uri,
                    siteUrl: m.value.url,
                });
            }
        }

        for (const local of localRings) {
            const ring = ringMap.get(local.uri);
            if (ring) {
                ring.title = local.title;
                ring.description = local.description;
                ring.status = local.status;
                ring.acceptancePolicy = local.acceptance_policy;
                ring.memberCount = local.member_count;
                ring.slug = local.slug;
                if (local.admin_did === did) ring.isAdmin = true;
            }
        }

        // Update pending counts
        for (const jr of joinRequests) {
            const ring = ringMap.get(jr.ring_uri);
            if (ring) ring.pendingCount = (ring.pendingCount || 0) + 1;
        }
        for (const pm of pendingMemberships) {
            const localRing = localRings.find(
                (r: any) => r.title === pm.ring_title,
            );
            if (localRing) {
                const ring = ringMap.get(localRing.uri);
                if (ring) ring.pendingCount = (ring.pendingCount || 0) + 1;
            }
        }

        return {
            type: "dashboard",
            site,
            unifiedRings: Array.from(ringMap.values()),
            joinRequests,
            pendingMemberships,
            blocks,
            did,
        };
    }

    private async getDiscoveryData(did: string) {
        const detectedSites: { url: string; title?: string; rss?: string }[] =
            [];

        try {
            const profileRes = await fetch(
                `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${did}`,
            );
            if (profileRes.ok) {
                const profile = (await profileRes.json()) as {
                    description?: string;
                };
                const desc = profile.description || "";
                const urls = Array.from(
                    desc.matchAll(/https?:\/\/[^\s]+/g),
                    (m) => m[0],
                );

                if (urls.length > 0) {
                    for (const url of urls.slice(0, 3)) {
                        try {
                            const meta = await fetchAndDiscoverMetadata(url);
                            if (meta) {
                                detectedSites.push({
                                    url: meta.url,
                                    title: meta.title,
                                    rss:
                                        meta.feeds.length > 0
                                            ? meta.feeds[0].url
                                            : "",
                                });
                            } else {
                                detectedSites.push({ url });
                            }
                        } catch {
                            detectedSites.push({ url });
                        }
                    }
                }
            }
        } catch {}

        return {
            discoveryStatus:
                detectedSites.length > 0
                    ? `Detected ${detectedSites.length} sites.`
                    : "No sites found in profile.",
            detectedSites,
            defaultSite:
                detectedSites.length > 0
                    ? detectedSites[0]
                    : { url: "", title: "", rss: "" },
        };
    }
}
