import { AtpAgent, AtUri } from "@atproto/api";

const NSID = {
    RING: "com.webring.ring",
    MEMBER: "com.webring.member",
    BLOCK: "com.webring.block",
    DEFS: "com.webring.defs",
};

export interface RingRecord {
    title: string;
    description: string;
    createdAt: string;
}

export interface MemberRecord {
    ring: {
        uri: string;
        cid?: string;
    };
    url: string;
    title: string;
    rss?: string;
    note?: string;
    createdAt: string;
}

export interface BlockRecord {
    subject: string; // DID
    ring: {
        uri: string;
        cid?: string;
    };
    reason?: string;
    createdAt: string;
}

export const AtProtoService = {
    // -------------------------------------------------------------------------
    // Ring Operations
    // -------------------------------------------------------------------------

    async createRing(agent: AtpAgent, title: string, description: string) {
        const record = {
            $type: NSID.RING,
            title,
            description,
            createdAt: new Date().toISOString(),
        };

        const response = await agent.api.com.atproto.repo.createRecord({
            repo: agent.session?.did ?? "",
            collection: NSID.RING,
            record,
            validate: false,
        });

        return response.data.uri;
    },

    async listRings(
        agent: AtpAgent,
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
        // @ts-ignore
        return response.data.records as {
            uri: string;
            cid: string;
            value: RingRecord;
        }[];
    },

    // -------------------------------------------------------------------------
    // Membership Operations
    // -------------------------------------------------------------------------

    async joinRing(
        agent: AtpAgent,
        ringUri: string,
        siteData: { url: string; title: string; rss?: string; note?: string },
    ) {
        const record = {
            $type: NSID.MEMBER,
            ring: {
                $type: `${NSID.DEFS}#ringRef`,
                uri: ringUri,
            },
            url: siteData.url,
            title: siteData.title,
            rss: siteData.rss,
            note: siteData.note,
            createdAt: new Date().toISOString(),
        };

        const response = await agent.api.com.atproto.repo.createRecord({
            repo: agent.session?.did ?? "",
            collection: NSID.MEMBER,
            record,
            validate: false,
        });

        return response.data.uri;
    },

    async leaveRing(agent: AtpAgent, memberRecordUri: string) {
        const { rkey } = new AtUri(memberRecordUri);

        await agent.api.com.atproto.repo.deleteRecord({
            repo: agent.session?.did ?? "",
            collection: NSID.MEMBER,
            rkey,
        });
    },

    async listMemberRecords(
        agent: AtpAgent,
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
        // @ts-ignore
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
        agent: AtpAgent,
        ringUri: string,
        memberDid: string,
        reason?: string,
    ) {
        const record = {
            $type: NSID.BLOCK,
            ring: {
                $type: `${NSID.DEFS}#ringRef`,
                uri: ringUri,
            },
            subject: memberDid,
            reason,
            createdAt: new Date().toISOString(),
        };

        await agent.api.com.atproto.repo.createRecord({
            repo: agent.session?.did ?? "",
            collection: NSID.BLOCK,
            record,
            validate: false,
        });
    },

    async listBlocks(
        agent: AtpAgent,
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
        // @ts-ignore
        return response.data.records as {
            uri: string;
            cid: string;
            value: BlockRecord;
        }[];
    },
};
