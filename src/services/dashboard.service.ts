import { AtUri } from "@atproto/api";
import { IDENTITY_RESOLVER_URL, PUBLIC_URL } from "../config.js";
import { RingRepository } from "../repositories/ring.repository.js";
// import type { Site, SqliteDatabaseInterface } from "../types/db.js";
import type { Site } from "../types/db.js";
import { AtProtoService } from "./atproto.js";
import { fetchAndDiscoverMetadata } from "./discovery.js";
import { restoreAgent } from "./oauth.js";
import { collectPendingRequests } from "./pending-requests.js";
import { discoverProfileLinks } from "./profile-links.js";
import { isOwnedBy } from "./ring.service.js";
import { SiteService } from "./site.service.js";

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

    constructor(private db: D1Database) {
        this.ringRepo = new RingRepository(db);
    }

    async getDashboardData(
        did: string,
    ): Promise<RegistrationData | DashboardViewData> {
        const agent = await restoreAgent(this.db, PUBLIC_URL, did);

        // サイト登録は PDS の site レコードが正本 (読めなければ DB のキャッシュ)
        const site = await new SiteService(this.db).getMySite(
            agent ?? null,
            did,
        );

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
            dbJoinRequests,
            dbPendingMemberships,
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
                bannerUrl: r.value.bannerUrl || "", // リングレコードの外部バナー URL
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
                            ring.bannerUrl = ringData.value.bannerUrl || "";
                        }

                        // Also update rings table locally if missing
                        await new RingRepository(this.db).upsertFromRecord(
                            uri,
                            ringData.value,
                        );
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

        // 承認待ち: 管理しているリングは PDS から (取れなければ DB のキャッシュ)
        const managedRings = Array.from(ringMap.values())
            .filter((r) => r.isAdmin || isOwnedBy(r.uri, did))
            .map((r) => ({ uri: r.uri, title: r.title }));
        const pending = await collectPendingRequests(
            managedRings,
            dbJoinRequests,
            dbPendingMemberships,
        );
        const joinRequests = pending.joinRequests;
        const pendingMemberships = pending.pendingMemberships;

        // Update pending counts
        for (const item of [...joinRequests, ...pendingMemberships]) {
            const ring = ringMap.get(item.ring_uri);
            if (ring) ring.pendingCount = (ring.pendingCount || 0) + 1;
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
        // 1. Bluesky プロフィールのリンク (app.bsky.actor.link、表示順)
        const candidates: {
            url: string;
            title?: string;
            rss?: string;
            link?: { uri: string; cid: string };
        }[] = await discoverProfileLinks(did);

        // 2. プロフィールの説明文に書かれた URL (予備)
        try {
            const profileRes = await fetch(
                `${IDENTITY_RESOLVER_URL}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
            );
            if (profileRes.ok) {
                const profile = (await profileRes.json()) as {
                    description?: string;
                };
                for (const m of (profile.description || "").matchAll(
                    /https?:\/\/[^\s]+/g,
                )) {
                    candidates.push({ url: m[0] });
                }
            }
        } catch {}

        // 重複を除き、最大 5 件
        const seen = new Set<string>();
        const unique = candidates
            .filter((c) => {
                const key = c.url.replace(/\/$/, "");
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 5);

        // 先頭 3 件はサイトを読んでタイトルと RSS を補う
        const detectedSites = await Promise.all(
            unique.map(async (c, i) => {
                if (i >= 3) return c;
                try {
                    const meta = await fetchAndDiscoverMetadata(c.url);
                    if (!meta) return c;
                    return {
                        ...c,
                        title: c.title || meta.title,
                        rss: meta.feeds[0]?.url || "",
                    };
                } catch {
                    return c;
                }
            }),
        );

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
