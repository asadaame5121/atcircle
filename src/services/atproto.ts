import { type Agent, type AtpAgent, AtUri } from "@atproto/api";
import { ids } from "../lexicons/lexicons.js";
import type * as Banner from "../lexicons/types/net/asadaame5121/at-circle/banner.js";
import type * as Block from "../lexicons/types/net/asadaame5121/at-circle/block.js";
import type * as Member from "../lexicons/types/net/asadaame5121/at-circle/member.js";
import type * as Request from "../lexicons/types/net/asadaame5121/at-circle/request.js";
import type * as Ring from "../lexicons/types/net/asadaame5121/at-circle/ring.js";

const NSID = {
    RING: ids.NetAsadaame5121AtCircleRing,
    MEMBER: ids.NetAsadaame5121AtCircleMember,
    BLOCK: ids.NetAsadaame5121AtCircleBlock,
    BANNER: ids.NetAsadaame5121AtCircleBanner,
    REQUEST: ids.NetAsadaame5121AtCircleRequest,
};

export type BannerRecord = Banner.Record;
export type RingRecord = Ring.Record;
export type MemberRecord = Member.Record;
export type BlockRecord = Block.Record;
export type RequestRecord = Request.Record;

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
            $type: NSID.RING,
            title,
            description,
            admin: ((agent as any).session?.did ??
                (agent as any).did ??
                "") as `did:${string}:${string}`,
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
        actorDid: string,
        cursor?: string,
        limit: number = 50,
    ) {
        const response = await agent.api.com.atproto.repo.listRecords({
            repo: actorDid,
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
        const { hostname, rkey } = new AtUri(uri);
        const response = await agent.api.com.atproto.repo.getRecord({
            repo: hostname,
            collection: NSID.RING,
            rkey,
        });
        return response.data as { uri: string; cid: string; value: RingRecord };
    },

    async updateRing(
        agent: AtpAgent | Agent,
        uri: string,
        title: string,
        description: string,
        status: "open" | "closed",
        acceptancePolicy: "automatic" | "manual",
        adminDid: string,
    ) {
        const { rkey } = new AtUri(uri);
        const record: RingRecord = {
            $type: NSID.RING,
            title,
            description,
            status,
            acceptancePolicy,
            admin: adminDid as `did:${string}:${string}`,
            createdAt: new Date().toISOString(), // Should ideally preserve original
        };

        await agent.api.com.atproto.repo.putRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.RING,
            rkey,
            record,
            validate: false,
        });
    },

    async deleteRing(agent: AtpAgent | Agent, ringUri: string) {
        const { rkey } = new AtUri(ringUri);
        await agent.api.com.atproto.repo.deleteRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.RING,
            rkey,
        });
    },

    // -------------------------------------------------------------------------
    // Member Operations
    // -------------------------------------------------------------------------

    async joinRing(
        agent: AtpAgent | Agent,
        ringUri: string,
        siteData: { url: string; title: string; rss?: string; note?: string },
    ) {
        const record: MemberRecord = {
            $type: NSID.MEMBER,
            ring: {
                uri: ringUri,
            },
            url: siteData.url as `${string}:${string}`,
            title: siteData.title,
            rss: siteData.rss as `${string}:${string}`,
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

    async createJoinRequest(
        agent: AtpAgent | Agent,
        ringUri: string,
        siteData: {
            url: string;
            title: string;
            rss?: string;
            message?: string;
        },
    ) {
        const record: RequestRecord = {
            $type: NSID.REQUEST,
            ring: {
                uri: ringUri,
            },
            siteUrl: siteData.url as `${string}:${string}`,
            siteTitle: siteData.title,
            rssUrl: siteData.rss as `${string}:${string}`,
            message: siteData.message,
            createdAt: new Date().toISOString(),
        };

        const response = await agent.api.com.atproto.repo.createRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.REQUEST,
            record,
            validate: false,
        });

        return response.data.uri;
    },

    async deleteJoinRequest(agent: AtpAgent | Agent, requestUri: string) {
        const { rkey } = new AtUri(requestUri);
        await agent.api.com.atproto.repo.deleteRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.REQUEST,
            rkey,
        });
    },

    async leaveRing(agent: AtpAgent | Agent, memberRecordUri: string) {
        const { rkey } = new AtUri(memberRecordUri);

        await agent.api.com.atproto.repo.deleteRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.MEMBER,
            rkey,
        });
    },

    async listBlockRecords(agent: AtpAgent | Agent, ownerDid: string) {
        const response = await agent.api.com.atproto.repo.listRecords({
            repo: ownerDid,
            collection: NSID.BLOCK,
        });
        return response.data.records as {
            uri: string;
            cid: string;
            value: BlockRecord;
        }[];
    },

    async unblock(agent: AtpAgent | Agent, blockUri: string) {
        const { rkey } = new AtUri(blockUri);
        await agent.api.com.atproto.repo.deleteRecord({
            repo: (agent as any).session?.did ?? (agent as any).did ?? "",
            collection: NSID.BLOCK,
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
            $type: NSID.BLOCK,
            subject: memberDid as `did:${string}:${string}`,
            ring: {
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

    // -------------------------------------------------------------------------
    // Banner Operations
    // -------------------------------------------------------------------------

    async setRingBanner(
        agent: AtpAgent | Agent,
        ringUri: string,
        imageBytes: Uint8Array,
        mimeType: string,
    ) {
        console.log(`[AtProtoService] setRingBanner: ringUri=${ringUri}`);

        // 1. Upload blob
        const blobRes = await agent.api.com.atproto.repo.uploadBlob(
            imageBytes,
            {
                encoding: mimeType,
            },
        );
        const bannerBlob = blobRes.data.blob;

        // 2. Create/Update Banner Record
        console.log(
            `[AtProtoService] setRingBanner: uploaded blob CID=${bannerBlob.ref.toString()}`,
        );
        console.log(`[AtProtoService] setRingBanner: ringUri=${ringUri}`);
        const record: BannerRecord = {
            $type: NSID.BANNER,
            ring: {
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

        return bannerBlob;
    },

    async getRingBanner(agent: AtpAgent | Agent, ringUri: string) {
        const { hostname, rkey } = new AtUri(ringUri);
        try {
            const response = await agent.api.com.atproto.repo.getRecord({
                repo: hostname,
                collection: NSID.BANNER,
                rkey,
            });
            return response.data as {
                uri: string;
                cid: string;
                value: BannerRecord;
            };
        } catch (_e) {
            return null; // No banner
        }
    },
};
