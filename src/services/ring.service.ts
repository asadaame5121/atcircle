import { AtUri } from "@atproto/api";
import { BSKY_SERVICE_URL, PUBLIC_URL } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { RingRepository } from "../repositories/ring.repository.js";
// import type { SqliteDatabaseInterface } from "../types/db.js";
import { AtProtoService } from "./atproto.js";
import { restoreAgent } from "./oauth.js";

/**
 * AT URI のリポジトリ所有者 (DID) が did と一致するか。
 * リング・メンバーのレコードはそれぞれ作成者のリポジトリにしか存在しないため、
 * URI の DID で所有者を判定できる (DB の owner_did に依存しない)。
 */
export const isOwnedBy = (uri: string | undefined, did: string): boolean => {
    if (!uri) return false;
    try {
        return new AtUri(uri).hostname === did;
    } catch {
        return false;
    }
};

/** バナーを変更できるか: メンバー指定なら自分のメンバー、なければ自分のリング。 */
const canEditBanner = (did: string, ringUri: string, memberUri?: string) =>
    memberUri ? isOwnedBy(memberUri, did) : isOwnedBy(ringUri, did);

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

        if (!canEditBanner(did, ringUri, memberUri)) {
            return { success: false, error: "Unauthorized" };
        }

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
        if (!canEditBanner(did, ringUri, memberUri)) {
            return { success: false, error: "Unauthorized" };
        }

        try {
            if (memberUri) {
                await this.ringRepo.updateMembershipBannerUrl(
                    memberUri,
                    bannerUrl,
                );
                return { success: true };
            }

            await this.ringRepo.updateBannerUrl(ringUri, bannerUrl);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}
