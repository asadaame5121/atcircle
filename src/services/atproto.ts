import { type Agent, AtUri } from "@atproto/api";
import { IDENTITY_RESOLVER_URL } from "../config.js";
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
    DECISION: ids.NetAsadaame5121AtCircleDecision,
};

export type DecisionStatus = "approved" | "suspended" | "removed";

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
        fields: {
            title: string;
            description: string;
            status: "open" | "closed";
            acceptancePolicy: "automatic" | "manual";
            admin: `did:${string}:${string}`;
            /** null で削除 */
            slug?: string | null;
            /** null で削除 */
            bannerUrl?: string | null;
        },
    ) {
        const { rkey } = new AtUri(uri);

        // 作成日時など、フォームで扱わない項目は既存レコードから引き継ぐ
        let existing: Partial<RingRecord> = {};
        try {
            const res = await agent.api.com.atproto.repo.getRecord({
                repo: agent.assertDid,
                collection: NSID.RING,
                rkey,
            });
            existing = (res.data.value ?? {}) as Partial<RingRecord>;
        } catch {
            // 取得できなければ新規扱い
        }

        const record: RingRecord = {
            ...existing,
            $type: NSID.RING,
            title: fields.title,
            description: fields.description,
            status: fields.status,
            acceptancePolicy: fields.acceptancePolicy,
            admin: fields.admin,
            createdAt: existing.createdAt || new Date().toISOString(),
        };
        if (fields.slug) record.slug = fields.slug;
        else delete record.slug;
        if (fields.bannerUrl) record.bannerUrl = fields.bannerUrl;
        else delete record.bannerUrl;

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

    /**
     * 参加をやめる。自動承認リングでは member、要承認リングでは request
     * レコードで参加しているので、URI のコレクションに合わせて消す。
     */
    async leaveRing(agent: Agent, memberRecordUri: string) {
        const { hostname, collection, rkey } = new AtUri(memberRecordUri);
        if (hostname !== agent.assertDid) {
            throw new Error("Not your membership record");
        }
        if (collection !== NSID.MEMBER && collection !== NSID.REQUEST) {
            throw new Error(`Not a membership record: ${collection}`);
        }
        await agent.api.com.atproto.repo.deleteRecord({
            repo: agent.assertDid,
            collection,
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

    /**
     * 参加 (member / request レコード) に対する管理者の判断を記録する。
     * 同じ対象に複数あるときは新しいものが有効 (resolveMemberships 参照)。
     */
    async putDecision(
        agent: Agent,
        ringUri: string,
        subject: { uri: string; cid: string },
        status: DecisionStatus,
    ) {
        const res = await agent.api.com.atproto.repo.createRecord({
            repo: agent.assertDid,
            collection: NSID.DECISION,
            record: {
                $type: NSID.DECISION,
                ring: { uri: ringUri },
                subject: { uri: subject.uri, cid: subject.cid },
                status,
                createdAt: new Date().toISOString(),
            },
        });
        return res.data.uri;
    },

    /** 対象への自分の decision をすべて取り消す (保留に戻す)。消した件数を返す。 */
    async deleteDecisions(agent: Agent, ringUri: string, subjectUri: string) {
        let removed = 0;
        let cursor: string | undefined;
        do {
            const res = await agent.api.com.atproto.repo.listRecords({
                repo: agent.assertDid,
                collection: NSID.DECISION,
                limit: 100,
                cursor,
            });
            for (const rec of res.data.records) {
                const value = rec.value as {
                    ring?: { uri?: string };
                    subject?: { uri?: string };
                };
                if (
                    value.ring?.uri === ringUri &&
                    value.subject?.uri === subjectUri
                ) {
                    await agent.api.com.atproto.repo.deleteRecord({
                        repo: agent.assertDid,
                        collection: NSID.DECISION,
                        rkey: new AtUri(rec.uri).rkey,
                    });
                    removed++;
                }
            }
            cursor = res.data.cursor;
        } while (cursor);
        return removed;
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

    /**
     * Fetch profiles using the public API (no auth required).
     * This avoids ScopeMissingError for read-only profile lookups.
     * Handles the 25-actor-per-request limit automatically.
     */
    async getProfilesPublic(actors: string[]) {
        if (actors.length === 0) return { profiles: [] as any[] };

        const BATCH_SIZE = 25;
        const allProfiles: any[] = [];

        for (let i = 0; i < actors.length; i += BATCH_SIZE) {
            const batch = actors.slice(i, i + BATCH_SIZE);
            const params = new URLSearchParams();
            for (const actor of batch) {
                params.append("actors", actor);
            }
            const res = await fetch(
                `${IDENTITY_RESOLVER_URL}/xrpc/app.bsky.actor.getProfiles?${params}`,
            );
            if (!res.ok) {
                pinoLogger.warn({
                    msg: "Public getProfiles failed",
                    status: res.status,
                    batch: batch.length,
                });
                continue;
            }
            const data = (await res.json()) as { profiles: any[] };
            allProfiles.push(...data.profiles);
        }

        return { profiles: allProfiles };
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
