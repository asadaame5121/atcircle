import { BSKY_SERVICE_URL, PUBLIC_URL } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { RingRepository } from "../repositories/ring.repository.js";
// import type { SqliteDatabaseInterface } from "../types/db.js";
import { AtProtoService } from "./atproto.js";
import { restoreAgent } from "./oauth.js";

export class RingService {
    private ringRepo: RingRepository;

    constructor(private db: D1Database) {
        this.ringRepo = new RingRepository(db);
    }

    async uploadBanner(
        did: string,
        ringUri: string,
        banner: Blob,
        memberUri?: string,
    ) {
        pinoLogger.info({
            msg: "[RingService] Received upload request",
            did,
            ringUri,
            memberUri,
        });

        const agent = await restoreAgent(this.db as any, PUBLIC_URL, did);
        if (!agent) {
            return { success: false, error: "Failed to restore agent" };
        }

        try {
            const arrayBuffer = await banner.arrayBuffer();
            const blob = await AtProtoService.setRingBanner(
                agent,
                ringUri,
                new Uint8Array(arrayBuffer),
                banner.type || "image/jpeg",
            );
            const cidString = blob.ref.toString();

            const pdsUrl =
                (agent as any).pdsUrl ||
                ((agent as any).service
                    ? typeof (agent as any).service === "string"
                        ? new URL((agent as any).service).origin
                        : (agent as any).service.origin
                    : BSKY_SERVICE_URL);
            const bannerUrl = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cidString}`;

            if (memberUri) {
                await this.ringRepo.updateMembershipBannerUrl(
                    memberUri,
                    bannerUrl,
                );
            } else {
                // Default to ring banner if no memberUri is provided (fallback or admin action)
                // We'll verify admin status in the route
                await this.ringRepo.updateBannerUrl(ringUri, bannerUrl);
            }

            return { success: true, url: bannerUrl };
        } catch (e: any) {
            pinoLogger.error({ msg: "[RingService] Upload failed", error: e });
            return { success: false, error: e.message };
        }
    }

    async saveWidgetSettings(
        did: string,
        ringUri: string,
        bannerUrl: string | null,
        memberUri?: string,
    ) {
        try {
            if (memberUri) {
                // If memberUri is provided, we just update the membership banner
                // (Ownership is checked implicitly by did in member-finding logic if needed, but here we trust the memberUri for now as it's from the user's request)
                await this.ringRepo.updateMembershipBannerUrl(
                    memberUri,
                    bannerUrl,
                );
                return { success: true };
            }

            const ownerDid = await this.ringRepo.getOwnerDid(ringUri);
            if (!ownerDid || ownerDid !== did) {
                return { success: false, error: "Unauthorized" };
            }

            await this.ringRepo.updateBannerUrl(ringUri, bannerUrl);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}
