import { AtUri } from "@atproto/api";
import { PUBLIC_URL } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { SiteRepository } from "../repositories/site.repository.js";
import type { SqliteDatabaseInterface } from "../types/db.js";
import { AtProtoService } from "./atproto.js";
import { restoreAgent } from "./oauth.js";

export class WidgetService {
    private ringRepo: RingRepository;
    private siteRepo: SiteRepository;

    constructor(private db: SqliteDatabaseInterface) {
        this.ringRepo = new RingRepository(db);
        this.siteRepo = new SiteRepository(db);
    }

    async getWidgetBuilderData(did: string, ringUri: string) {
        const site = await this.siteRepo.findFirstByUserDid(did);
        if (!site) return { error: "site_not_found" };

        const ring = await this.ringRepo.findByUri(ringUri);
        let ringTitle = ring?.title;
        const bannerUrl = ring?.banner_url || "";

        if (!ringTitle) {
            pinoLogger.info({
                msg: "[WidgetService] Ring title not in DB, fetching from ATProto",
                ringUri,
            });
            try {
                const agent = await restoreAgent(
                    this.db as any,
                    PUBLIC_URL,
                    did,
                );
                if (agent) {
                    const ringData = await AtProtoService.getRing(
                        agent,
                        ringUri,
                    );
                    ringTitle = ringData.value.title;
                    const ownerDid = new AtUri(ringUri).hostname;
                    await this.ringRepo.saveRing(
                        ringUri,
                        ownerDid,
                        ringTitle,
                        ringData.value.description || null,
                    );
                }
            } catch (e) {
                pinoLogger.error({
                    msg: "Failed to fetch ring title from ATProto",
                    error: e,
                });
            }
        }

        return {
            site,
            ringTitle: ringTitle || "Webring",
            bannerUrl,
            baseUrl: PUBLIC_URL,
        };
    }
}
