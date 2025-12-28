import { Agent, AtpAgent, AtUri } from "@atproto/api";

const NSID = {
    RING: "net.asadaame5121.at-circle.ring",
    MEMBER: "net.asadaame5121.at-circle.member",
    BLOCK: "net.asadaame5121.at-circle.block",
    DEFS: "net.asadaame5121.at-circle.defs",
};

export interface RingRecord {
    title: string;
    description: string;
    status: "open" | "closed";
    acceptancePolicy: "automatic" | "manual";
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

    async createRing(
        agent: AtpAgent | Agent,
        title: string,
        description: string,
    ) {
        const record = {
            $type: NSID.RING,
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
        // @ts-ignore
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
        const record = {
            $type: NSID.RING,
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
        agent: AtpAgent | Agent,
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
        // @ts-ignore
        return response.data.records as {
            uri: string;
            cid: string;
            value: BlockRecord;
        }[];
    },
};
