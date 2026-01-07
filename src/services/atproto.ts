import { type Agent, AtUri } from "@atproto/api";
import { NetNS } from "../lexicons/index.js";
import { ids } from "../lexicons/lexicons.js";
import type * as Banner from "../lexicons/types/net/asadaame5121/at-circle/banner.js";
import type * as Block from "../lexicons/types/net/asadaame5121/at-circle/block.js";
import type * as Member from "../lexicons/types/net/asadaame5121/at-circle/member.js";
import type * as Request from "../lexicons/types/net/asadaame5121/at-circle/request.js";
import type * as Ring from "../lexicons/types/net/asadaame5121/at-circle/ring.js";
import { logger as pinoLogger } from "../lib/logger.js";

export type BannerRecord = Banner.Record;
export type RingRecord = Ring.Record;
export type MemberRecord = Member.Record;
export type BlockRecord = Block.Record;
export type RequestRecord = Request.Record;

export type AtpRecordView<T> = {
    uri: string;
    cid: string;
    value: T;
};

const NSID = {
    RING: ids.NetAsadaame5121AtCircleRing,
    MEMBER: ids.NetAsadaame5121AtCircleMember,
    REQUEST: ids.NetAsadaame5121AtCircleRequest,
    BLOCK: ids.NetAsadaame5121AtCircleBlock,
    BANNER: ids.NetAsadaame5121AtCircleBanner,
};

export const AtProtoService = {
    // -------------------------------------------------------------------------
    // Ring Operations
    // -------------------------------------------------------------------------

    async createRing(agent: Agent, title: string, description: string) {
        const net = new NetNS(agent);
        const record: RingRecord = {
            $type: NSID.RING,
            title,
            description,
            admin: agent.assertDid,
            status: "open", // Default to open on creation
            acceptancePolicy: "automatic", // Default to automatic
            createdAt: new Date().toISOString(),
        };

        const response = await net.asadaame5121.atCircle.ring.create(
            { repo: agent.assertDid },
            record,
        );

        return response.uri;
    },

    async listRings(
        agent: Agent,
        actorDid: string,
        cursor?: string,
        limit: number = 50,
    ) {
        const net = new NetNS(agent);
        const response = await net.asadaame5121.atCircle.ring.list({
            repo: actorDid,
            cursor,
            limit,
        });
        return response.records as AtpRecordView<RingRecord>[];
    },

    async getRing(agent: Agent, uri: string) {
        const { hostname, rkey } = new AtUri(uri);
        const response = await agent.api.com.atproto.repo.getRecord({
            repo: hostname,
            collection: NSID.RING,
            rkey,
        });
        return response.data as AtpRecordView<RingRecord>;
    },

    async updateRing(
        agent: Agent,
        uri: string,
        title: string,
        description: string,
        status: "open" | "closed",
        acceptancePolicy: "automatic" | "manual",
        adminDid: `did:${string}:${string}`,
    ) {
        const { rkey } = new AtUri(uri);
        const record: RingRecord = {
            $type: NSID.RING,
            title,
            description,
            status,
            acceptancePolicy,
            admin: adminDid,
            createdAt: new Date().toISOString(), // Should ideally preserve original
        };

        await agent.api.com.atproto.repo.putRecord({
            repo: agent.assertDid,
            collection: NSID.RING,
            rkey,
            record,
            validate: false,
        });
    },

    async deleteRing(agent: Agent, ringUri: string) {
        const { rkey } = new AtUri(ringUri);
        const net = new NetNS(agent);
        await net.asadaame5121.atCircle.ring.delete({
            repo: agent.assertDid,
            rkey,
        });
    },

    // -------------------------------------------------------------------------
    // Member Operations
    // -------------------------------------------------------------------------

    async joinRing(
        agent: Agent,
        ringUri: string,
        siteData: { url: string; title: string; rss?: string; note?: string },
    ) {
        const net = new NetNS(agent);
        const record: MemberRecord = {
            $type: NSID.MEMBER,
            ring: {
                uri: ringUri,
            },
            url: siteData.url,
            title: siteData.title,
            rss: siteData.rss,
            note: siteData.note,
            createdAt: new Date().toISOString(),
        };

        const response = await net.asadaame5121.atCircle.member.create(
            { repo: agent.assertDid },
            record,
        );

        return response.uri;
    },

    async createJoinRequest(
        agent: Agent,
        ringUri: string,
        siteData: {
            url: string;
            title: string;
            rss?: string;
            message?: string;
        },
    ) {
        const net = new NetNS(agent);
        const record: RequestRecord = {
            $type: NSID.REQUEST,
            ring: {
                uri: ringUri,
            },
            siteUrl: siteData.url,
            siteTitle: siteData.title,
            rssUrl: siteData.rss,
            message: siteData.message,
            createdAt: new Date().toISOString(),
        };

        const response = await net.asadaame5121.atCircle.request.create(
            { repo: agent.assertDid },
            record,
        );

        return response.uri;
    },

    async deleteJoinRequest(agent: Agent, requestUri: string) {
        const { rkey } = new AtUri(requestUri);
        const net = new NetNS(agent);
        await net.asadaame5121.atCircle.request.delete({
            repo: agent.assertDid,
            rkey,
        });
    },

    async leaveRing(agent: Agent, memberRecordUri: string) {
        const { rkey } = new AtUri(memberRecordUri);
        const net = new NetNS(agent);

        await net.asadaame5121.atCircle.member.delete({
            repo: agent.assertDid,
            rkey,
        });
    },

    async listBlockRecords(agent: Agent, ownerDid: string) {
        const net = new NetNS(agent);
        const response = await net.asadaame5121.atCircle.block.list({
            repo: ownerDid,
        });
        return response.records as AtpRecordView<BlockRecord>[];
    },

    async unblock(agent: Agent, blockUri: string) {
        const { rkey } = new AtUri(blockUri);
        const net = new NetNS(agent);
        await net.asadaame5121.atCircle.block.delete({
            repo: agent.assertDid,
            rkey,
        });
    },

    async listMemberRecords(
        agent: Agent,
        repoDid: string,
        cursor?: string,
        limit: number = 50,
    ) {
        // Use generic listRecords to support standard PDS
        const response = await agent.api.com.atproto.repo.listRecords({
            repo: repoDid,
            collection: NSID.MEMBER,
            cursor,
            limit,
        });

        // Map to expected view format
        return response.data.records.map((r) => ({
            uri: r.uri,
            cid: r.cid,
            value: r.value as MemberRecord,
        })) as AtpRecordView<MemberRecord>[];
    },

    async findUserLinkedRings(agent: Agent, did: string) {
        // 1. Find rings joined by user (Member records in user's repo)
        // We try to use the agent provided. If it fails (e.g. unauth agent on constrained PDS), we might need to resolve PDS.
        // Assuming 'agent' here is capable of listing records for the DID (e.g. user session or properly configured public agent).
        const joinedRings: string[] = [];
        try {
            const memberRecords = await this.listMemberRecords(agent, did);
            memberRecords.forEach((r) => {
                if (r.value.ring?.uri) joinedRings.push(r.value.ring.uri);
            });
        } catch (e) {
            pinoLogger.error({
                msg: "Failed to list member records",
                error: e,
                did,
            });
        }

        // 2. Find rings owned/administered by user via Constellation
        // Constellation indexes backlinks, so we look for records pointing to the user.
        // Ring records have 'admin' field pointing to user.
        const ownedRings: string[] = [];
        try {
            const constellationUrl = `https://constellation.microcosm.blue/links/all?target=${encodeURIComponent(
                did,
            )}`;
            const res = await fetch(constellationUrl);
            if (res.ok) {
                const data = (await res.json()) as any[];
                // Filter for Ring records
                data.forEach((link: any) => {
                    if (link.source?.includes(NSID.RING)) {
                        ownedRings.push(link.source);
                    }
                });
            } else {
                pinoLogger.warn({
                    msg: "Constellation API failed",
                    status: res.status,
                    did,
                });
            }
        } catch (e) {
            pinoLogger.error({
                msg: "Failed to query Constellation",
                error: e,
                did,
            });
        }

        return {
            joined: [...new Set(joinedRings)],
            owned: [...new Set(ownedRings)],
            all: [...new Set([...joinedRings, ...ownedRings])],
        };
    },

    // -------------------------------------------------------------------------
    // Moderation Operations
    // -------------------------------------------------------------------------

    async blockMember(
        agent: Agent,
        ringUri: string,
        memberDid: string,
        reason?: string,
    ) {
        const net = new NetNS(agent);
        const record: BlockRecord = {
            $type: NSID.BLOCK,
            subject: memberDid,
            ring: {
                uri: ringUri,
            },
            reason,
            createdAt: new Date().toISOString(),
        };

        await net.asadaame5121.atCircle.block.create(
            { repo: agent.assertDid },
            record,
        );
    },

    // -------------------------------------------------------------------------
    // Banner Operations
    // -------------------------------------------------------------------------

    async setRingBanner(
        agent: Agent,
        ringUri: string,
        imageBytes: Uint8Array,
        mimeType: string,
    ) {
        pinoLogger.info({ msg: "setRingBanner", ringUri });

        // 1. Upload blob
        const blobRes = await agent.uploadBlob(imageBytes, {
            encoding: mimeType,
        });
        const bannerBlob = blobRes.data.blob;

        // 2. Create/Update Banner Record
        pinoLogger.info({
            msg: "setRingBanner: uploaded blob",
            cid: bannerBlob.ref.toString(),
            ringUri,
        });
        const net = new NetNS(agent);
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
        const repo = agent.assertDid;
        pinoLogger.info({
            msg: "setRingBanner: putRecord",
            repo,
            rkey,
        });

        await net.asadaame5121.atCircle.banner.put({ repo, rkey }, record);

        return bannerBlob;
    },

    async getRingBanner(agent: Agent, ringUri: string) {
        const { hostname, rkey } = new AtUri(ringUri);
        const net = new NetNS(agent);
        try {
            // rkey is the same as the ring's rkey
            const response = await net.asadaame5121.atCircle.banner.get({
                repo: hostname,
                rkey,
            });
            return response as AtpRecordView<BannerRecord>;
        } catch (_e) {
            return null; // No banner
        }
    },

    // -------------------------------------------------------------------------
    // Bluesky / Profile / Graph Operations
    // -------------------------------------------------------------------------

    async getProfile(agent: Agent, actor: string) {
        const response = await agent.getProfile({
            actor,
        });
        return response.data;
    },

    async getProfiles(agent: Agent, actors: string[]) {
        if (actors.length === 0) return { profiles: [] };
        const response = await agent.getProfiles({
            actors,
        });
        return response.data;
    },

    async resolveHandle(agent: Agent, handle: string) {
        try {
            const res = await agent.resolveHandle({ handle });
            return res.data.did;
        } catch (e) {
            pinoLogger.error({
                msg: "Failed to resolve handle",
                handle,
                error: e,
            });
            return null;
        }
    },
};
