import { type Agent, type AtpAgent, AtUri } from "@atproto/api";
import * as AtCircle from "../lexicons/net/asadaame5121/at-circle.js";

const NSID = {
    RING: AtCircle.ring.$nsid,
    MEMBER: AtCircle.member.$nsid,
    BLOCK: AtCircle.block.$nsid,
    DEFS: AtCircle.defs.$nsid,
    BANNER: AtCircle.banner.$nsid,
};

export type BannerRecord = AtCircle.banner.Main;
export type RingRecord = AtCircle.ring.Main;
export type MemberRecord = AtCircle.member.Main;
export type BlockRecord = AtCircle.block.Main;

export const AtProtoService = {
    // -------------------------------------------------------------------------
    // Ring Operations
    // -------------------------------------------------------------------------

    async createRing(
        agent: AtpAgent | Agent,
        title: string,
        description: string,
    ) {
        const record: RingRecord = {
            $type: AtCircle.ring.$nsid,
            title,
            description,
            status: "open", // Default to open on creation
            acceptancePolicy: "automatic", // Default to automatic
            createdAt: new Date().toISOString(),
        };

        const response = await agent.api.com.atproto.repo.createRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.RING,
            record,
            validate: false,
        });

        return response.data.uri;
    },

    async listRings(
        agent: AtpAgent | Agent,
        ownerDid: string,
        cursor?: string,
        limit: number = 50,
    ) {
        const response = await agent.api.com.atproto.repo.listRecords({
            repo: ownerDid,
            collection: NSID.RING,
            cursor,
            limit,
        });
        return response.data.records as {
            uri: string;
            cid: string;
            value: RingRecord;
        }[];
    },

    async getRing(agent: AtpAgent | Agent, uri: string) {
        const atUri = new AtUri(uri);
        const response = await agent.api.com.atproto.repo.getRecord({
            repo: atUri.hostname,
            collection: atUri.collection,
            rkey: atUri.rkey,
        });
        return response.data as unknown as {
            uri: string;
            cid: string;
            value: RingRecord;
        };
    },

    async updateRing(
        agent: AtpAgent | Agent,
        uri: string,
        title: string,
        description: string,
        status: "open" | "closed",
        acceptancePolicy: "automatic" | "manual",
    ) {
        const { rkey } = new AtUri(uri);
        const record: RingRecord = {
            $type: AtCircle.ring.$nsid,
            title,
            description,
            status,
            acceptancePolicy,
            createdAt: new Date().toISOString(),
        };

        await agent.api.com.atproto.repo.putRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.RING,
            rkey,
            record,
            validate: false,
        });
    },

    // -------------------------------------------------------------------------
    // Membership Operations
    // -------------------------------------------------------------------------

    async joinRing(
        agent: AtpAgent | Agent,
        ringUri: string,
        siteData: { url: string; title: string; rss?: string; note?: string },
    ) {
        const record: MemberRecord = {
            $type: AtCircle.member.$nsid,
            ring: {
                // @ts-expect-error
                uri: ringUri,
            },
            // @ts-expect-error
            url: siteData.url,
            title: siteData.title,
            // @ts-expect-error
            rss: siteData.rss,
            note: siteData.note,
            createdAt: new Date().toISOString(),
        };

        const response = await agent.api.com.atproto.repo.createRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.MEMBER,
            record,
            validate: false,
        });

        return response.data.uri;
    },

    async leaveRing(agent: AtpAgent | Agent, memberRecordUri: string) {
        const { rkey } = new AtUri(memberRecordUri);

        await agent.api.com.atproto.repo.deleteRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.MEMBER,
            rkey,
        });
    },

    async listMemberRecords(
        agent: AtpAgent | Agent,
        repoDid: string,
        cursor?: string,
        limit: number = 50,
    ) {
        const response = await agent.api.com.atproto.repo.listRecords({
            repo: repoDid,
            collection: NSID.MEMBER,
            cursor,
            limit,
        });
        return response.data.records as {
            uri: string;
            cid: string;
            value: MemberRecord;
        }[];
    },

    // -------------------------------------------------------------------------
    // Moderation Operations
    // -------------------------------------------------------------------------

    async blockMember(
        agent: AtpAgent | Agent,
        ringUri: string,
        memberDid: string,
        reason?: string,
    ) {
        const record: BlockRecord = {
            $type: AtCircle.block.$nsid,
            // @ts-expect-error
            subject: memberDid,
            ring: {
                // @ts-expect-error
                uri: ringUri,
            },
            reason,
            createdAt: new Date().toISOString(),
        };

        await agent.api.com.atproto.repo.createRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.BLOCK,
            record,
            validate: false,
        });
    },

    async listBlocks(
        agent: AtpAgent | Agent,
        ringOwnerDid: string,
        cursor?: string,
        limit: number = 50,
    ) {
        const response = await agent.api.com.atproto.repo.listRecords({
            repo: ringOwnerDid,
            collection: NSID.BLOCK,
            cursor,
            limit,
        });
        return response.data.records as {
            uri: string;
            cid: string;
            value: BlockRecord;
        }[];
    },

    // -------------------------------------------------------------------------
    // Blob & Banner Operations
    // -------------------------------------------------------------------------

    async uploadBlob(
        agent: AtpAgent | Agent,
        blob: Blob | Buffer | Uint8Array,
        mimeType: string,
    ) {
        console.log(
            `[AtProtoService] uploadBlob: mimeType=${mimeType}, size=${
                (blob as any).length || (blob as any).size
            }`,
        );
        const response = await agent.api.com.atproto.repo.uploadBlob(blob, {
            encoding: mimeType,
        });
        console.log(
            `[AtProtoService] uploadBlob success: CID=${response.data.blob.ref.toString()}`,
        );
        return response.data.blob;
    },

    async setRingBanner(
        agent: AtpAgent | Agent,
        ringUri: string,
        bannerBlob: any,
    ) {
        console.log(`[AtProtoService] setRingBanner: ringUri=${ringUri}`);
        const record: BannerRecord = {
            $type: AtCircle.banner.$nsid,
            ring: {
                // @ts-expect-error
                uri: ringUri,
            },
            banner: bannerBlob,
            createdAt: new Date().toISOString(),
        };

        // We use the ring's rkey as the banner's rkey for simplicity (1 banner per ring)
        const { rkey } = new AtUri(ringUri);
        const repo = (agent as any).session?.did ?? (agent as any).did ?? "";
        console.log(
            `[AtProtoService] setRingBanner: putRecord repo=${repo}, rkey=${rkey}`,
        );

        await agent.api.com.atproto.repo.putRecord({
            repo,
            collection: NSID.BANNER,
            rkey,
            record,
            validate: false,
        });
        console.log("[AtProtoService] setRingBanner: success");
    },

    async getRingBanner(agent: AtpAgent | Agent, ringUri: string) {
        const { rkey } = new AtUri(ringUri);
        const repo =
            (agent as any).session?.did ??
            (agent as any).did ??
            new AtUri(ringUri).hostname;

        try {
            const response = await agent.api.com.atproto.repo.getRecord({
                repo,
                collection: NSID.BANNER,
                rkey,
            });
            return response.data as unknown as {
                uri: string;
                cid: string;
                value: BannerRecord;
            };
        } catch (_e) {
            return null;
        }
    },
};
