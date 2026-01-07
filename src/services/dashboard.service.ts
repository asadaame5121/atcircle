import { AtUri } from "@atproto/api";
import { PUBLIC_URL } from "../config.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { SiteRepository } from "../repositories/site.repository.js";
// import type { Site, SqliteDatabaseInterface } from "../types/db.js";
import type { Site } from "../types/db.js";
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

    constructor(private db: D1Database) {
        this.ringRepo = new RingRepository(db);
        this.siteRepo = new SiteRepository(db);
    }

    async getDashboardData(
        did: string,
    ): Promise<RegistrationData | DashboardViewData> {
        const agent = await restoreAgent(this.db, PUBLIC_URL, did);

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
            localMemberships,
        ] = await Promise.all([
            agent ? AtProtoService.listRings(agent, did) : Promise.resolve([]),
            agent
                ? AtProtoService.listMemberRecords(agent, did)
                : Promise.resolve([]),
            this.ringRepo.findJoinRequestsByAdmin(did),
            this.ringRepo.findPendingMembershipsByAdmin(did),
            this.ringRepo.findBlocksByAdmin(did),
            this.ringRepo.getAllWithMemberCount(),
            this.ringRepo.findApprovedMembershipsByAdmin(did),
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
                bannerUrl: r.value.banner_url || "", // This is the banner on the ring record (if any)
                pendingCount: 0,
            });
        }

        // Helper to fetch missing ring data
        const missingRings: string[] = [];
        const syncPromises: Promise<any>[] = [];

        for (const m of myMemberships) {
            let ringUri = m.value.ring.uri;

            // RECOVERY: Check for malformed HTTP URIs found in some records
            // e.g. "https://at-circle.asadaame5121.net/rings/view?ring=at%3A%2F%2F..."
            if (ringUri.startsWith("http")) {
                try {
                    const url = new URL(ringUri);
                    const extracted = url.searchParams.get("ring");
                    if (extracted?.startsWith("at://")) {
                        ringUri = extracted;
                    }
                } catch {
                    // Ignore parsing errors
                }
            }

            // Sync missing membership locally
            const localMatch = localMemberships.find(
                (lm) => lm.member_uri === m.uri || lm.ring_uri === ringUri,
            );
            if (!localMatch && ringUri.startsWith("at://")) {
                syncPromises.push(
                    (async () => {
                        try {
                            const siteIdResult = (await this.db
                                .prepare(
                                    "SELECT id FROM sites WHERE user_did = ?",
                                )
                                .bind(did)
                                .first()) as { id: number } | null;

                            if (siteIdResult) {
                                await this.db
                                    .prepare(
                                        "INSERT OR IGNORE INTO memberships (ring_uri, site_id, member_uri, status, created_at) VALUES (?, ?, ?, 'approved', ?)",
                                    )
                                    .bind(
                                        ringUri,
                                        siteIdResult.id,
                                        m.uri,
                                        m.value.createdAt
                                            ? Math.floor(
                                                  new Date(
                                                      m.value.createdAt,
                                                  ).getTime() / 1000,
                                              )
                                            : Math.floor(Date.now() / 1000),
                                    )
                                    .run();
                            }
                        } catch (e) {
                            console.error(
                                "[Dashboard] Background sync failed",
                                e,
                            );
                        }
                    })(),
                );
            }

            if (!ringMap.has(ringUri)) {
                missingRings.push(ringUri);
                // Initialize with loading state
                ringMap.set(ringUri, {
                    uri: ringUri,
                    title: "Loading...",
                    isMember: true,
                    memberUri: m.uri,
                    siteUrl: m.value.url,
                });
            } else {
                const existing = ringMap.get(ringUri);
                existing.isMember = true;
                existing.memberUri = m.uri;
                existing.siteUrl = m.value.url;
            }
        }

        // Parallel fetch for missing rings and sync operations
        if (agent) {
            await Promise.allSettled([
                ...syncPromises,
                ...missingRings.map(async (uri) => {
                    try {
                        // Basic validation for AT URI
                        if (!uri.startsWith("at://") || !uri.includes("/")) {
                            console.warn(
                                `[Dashboard] Invalid ring URI found in membership: ${uri}`,
                            );
                            const ring = ringMap.get(uri);
                            if (ring) {
                                ring.title = "Invalid Ring Data";
                            }
                            return;
                        }

                        const ringData = await AtProtoService.getRing(
                            agent,
                            uri,
                        );
                        const ring = ringMap.get(uri);
                        if (ring) {
                            ring.title = ringData.value.title;
                            ring.description = ringData.value.description || "";
                            ring.status = ringData.value.status || "open";
                            ring.acceptancePolicy =
                                ringData.value.acceptancePolicy || "automatic";
                            const ownerDid = new AtUri(uri).hostname;
                            ring.adminDid = ringData.value.admin || ownerDid;
                            if (ring.adminDid === did) ring.isAdmin = true;
                            ring.bannerUrl =
                                (ringData.value as any).banner_url || "";
                        }

                        // Also update rings table locally if missing
                        await this.db
                            .prepare(
                                "INSERT OR IGNORE INTO rings (uri, owner_did, admin_did, title, description, acceptance_policy, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            )
                            .bind(
                                uri,
                                new AtUri(uri).hostname,
                                ringData.value.admin || new AtUri(uri).hostname,
                                ringData.value.title,
                                ringData.value.description || null,
                                ringData.value.acceptancePolicy || "automatic",
                                ringData.value.status || "open",
                            )
                            .run();
                    } catch (e) {
                        console.error(`Failed to fetch missing ring ${uri}`, e);
                    }
                }),
            ]);
        }

        // Merge local memberships (fix for "Loading..." and missing rings due to PDS delay)
        for (const m of localMemberships) {
            const ringUri = m.ring_uri;
            const existing = ringMap.get(ringUri);

            if (existing) {
                existing.isMember = true;
                if (!existing.siteUrl) existing.siteUrl = m.site_url;
                if (!existing.memberUri) existing.memberUri = m.member_uri;
            } else {
                if (
                    ringUri ===
                    `at://${did}/app.bsky.feed.generator/${
                        new AtUri(ringUri).rkey
                    }`
                ) {
                    continue;
                }

                ringMap.set(ringUri, {
                    uri: ringUri,
                    title: m.ring_title || "Loading...",
                    isMember: true,
                    memberUri: m.member_uri,
                    siteUrl: m.site_url,
                    description: "", // Will be updated by localRings loop
                    status: "open",
                    acceptancePolicy: "automatic",
                    pendingCount: 0,
                    isAdmin: false, // Will be updated if owner matches
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
                ring.bannerUrl = local.banner_url || ring.bannerUrl || "";
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
