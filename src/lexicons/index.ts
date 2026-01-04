/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
    type FetchHandler,
    type FetchHandlerOptions,
    XrpcClient,
} from "@atproto/xrpc";
import { schemas } from "./lexicons.js";
import type * as AppBskyActorGetProfile from "./types/app/bsky/actor/getProfile.js";
import type * as AppBskyActorStatus from "./types/app/bsky/actor/status.js";
import type * as AppBskyFeedPostgate from "./types/app/bsky/feed/postgate.js";
import type * as AppBskyFeedThreadgate from "./types/app/bsky/feed/threadgate.js";
import type * as AppBskyGraphGetFollowers from "./types/app/bsky/graph/getFollowers.js";
import type * as NetAsadaame5121AtCircleBanner from "./types/net/asadaame5121/at-circle/banner.js";
import type * as NetAsadaame5121AtCircleBlock from "./types/net/asadaame5121/at-circle/block.js";
import type * as NetAsadaame5121AtCircleMember from "./types/net/asadaame5121/at-circle/member.js";
import type * as NetAsadaame5121AtCircleRequest from "./types/net/asadaame5121/at-circle/request.js";
import type * as NetAsadaame5121AtCircleRing from "./types/net/asadaame5121/at-circle/ring.js";
import type { OmitKey, Un$Typed } from "./util.js";

export * as AppBskyActorDefs from "./types/app/bsky/actor/defs.js";
export * as AppBskyActorGetProfile from "./types/app/bsky/actor/getProfile.js";
export * as AppBskyActorStatus from "./types/app/bsky/actor/status.js";
export * as AppBskyEmbedDefs from "./types/app/bsky/embed/defs.js";
export * as AppBskyEmbedExternal from "./types/app/bsky/embed/external.js";
export * as AppBskyEmbedImages from "./types/app/bsky/embed/images.js";
export * as AppBskyEmbedRecord from "./types/app/bsky/embed/record.js";
export * as AppBskyEmbedRecordWithMedia from "./types/app/bsky/embed/recordWithMedia.js";
export * as AppBskyEmbedVideo from "./types/app/bsky/embed/video.js";
export * as AppBskyFeedDefs from "./types/app/bsky/feed/defs.js";
export * as AppBskyFeedPostgate from "./types/app/bsky/feed/postgate.js";
export * as AppBskyFeedThreadgate from "./types/app/bsky/feed/threadgate.js";
export * as AppBskyGraphDefs from "./types/app/bsky/graph/defs.js";
export * as AppBskyGraphGetFollowers from "./types/app/bsky/graph/getFollowers.js";
export * as AppBskyLabelerDefs from "./types/app/bsky/labeler/defs.js";
export * as AppBskyNotificationDefs from "./types/app/bsky/notification/defs.js";
export * as AppBskyRichtextFacet from "./types/app/bsky/richtext/facet.js";
export * as ComAtprotoLabelDefs from "./types/com/atproto/label/defs.js";
export * as ComAtprotoModerationDefs from "./types/com/atproto/moderation/defs.js";
export * as ComAtprotoRepoStrongRef from "./types/com/atproto/repo/strongRef.js";
export * as NetAsadaame5121AtCircleBanner from "./types/net/asadaame5121/at-circle/banner.js";
export * as NetAsadaame5121AtCircleBlock from "./types/net/asadaame5121/at-circle/block.js";
export * as NetAsadaame5121AtCircleDefs from "./types/net/asadaame5121/at-circle/defs.js";
export * as NetAsadaame5121AtCircleMember from "./types/net/asadaame5121/at-circle/member.js";
export * as NetAsadaame5121AtCircleRequest from "./types/net/asadaame5121/at-circle/request.js";
export * as NetAsadaame5121AtCircleRing from "./types/net/asadaame5121/at-circle/ring.js";
export * as ToolsOzoneReportDefs from "./types/tools/ozone/report/defs.js";

export const APP_BSKY_ACTOR = {
    StatusLive: "app.bsky.actor.status#live",
};
export const APP_BSKY_FEED = {
    DefsRequestLess: "app.bsky.feed.defs#requestLess",
    DefsRequestMore: "app.bsky.feed.defs#requestMore",
    DefsInteractionLike: "app.bsky.feed.defs#interactionLike",
    DefsInteractionSeen: "app.bsky.feed.defs#interactionSeen",
    DefsClickthroughItem: "app.bsky.feed.defs#clickthroughItem",
    DefsContentModeVideo: "app.bsky.feed.defs#contentModeVideo",
    DefsInteractionQuote: "app.bsky.feed.defs#interactionQuote",
    DefsInteractionReply: "app.bsky.feed.defs#interactionReply",
    DefsInteractionShare: "app.bsky.feed.defs#interactionShare",
    DefsClickthroughEmbed: "app.bsky.feed.defs#clickthroughEmbed",
    DefsInteractionRepost: "app.bsky.feed.defs#interactionRepost",
    DefsClickthroughAuthor: "app.bsky.feed.defs#clickthroughAuthor",
    DefsClickthroughReposter: "app.bsky.feed.defs#clickthroughReposter",
    DefsContentModeUnspecified: "app.bsky.feed.defs#contentModeUnspecified",
};
export const APP_BSKY_GRAPH = {
    DefsModlist: "app.bsky.graph.defs#modlist",
    DefsCuratelist: "app.bsky.graph.defs#curatelist",
    DefsReferencelist: "app.bsky.graph.defs#referencelist",
};
export const COM_ATPROTO_MODERATION = {
    DefsReasonRude: "com.atproto.moderation.defs#reasonRude",
    DefsReasonSpam: "com.atproto.moderation.defs#reasonSpam",
    DefsReasonOther: "com.atproto.moderation.defs#reasonOther",
    DefsReasonAppeal: "com.atproto.moderation.defs#reasonAppeal",
    DefsReasonSexual: "com.atproto.moderation.defs#reasonSexual",
    DefsReasonViolation: "com.atproto.moderation.defs#reasonViolation",
    DefsReasonMisleading: "com.atproto.moderation.defs#reasonMisleading",
};
export const TOOLS_OZONE_REPORT = {
    DefsReasonOther: "tools.ozone.report.defs#reasonOther",
    DefsReasonAppeal: "tools.ozone.report.defs#reasonAppeal",
    DefsReasonRuleOther: "tools.ozone.report.defs#reasonRuleOther",
    DefsReasonSelfHarmED: "tools.ozone.report.defs#reasonSelfHarmED",
    DefsReasonSexualNCII: "tools.ozone.report.defs#reasonSexualNCII",
    DefsReasonSexualOther: "tools.ozone.report.defs#reasonSexualOther",
    DefsReasonSexualAnimal: "tools.ozone.report.defs#reasonSexualAnimal",
    DefsReasonMisleadingBot: "tools.ozone.report.defs#reasonMisleadingBot",
    DefsReasonSelfHarmOther: "tools.ozone.report.defs#reasonSelfHarmOther",
    DefsReasonViolenceOther: "tools.ozone.report.defs#reasonViolenceOther",
    DefsReasonMisleadingScam: "tools.ozone.report.defs#reasonMisleadingScam",
    DefsReasonMisleadingSpam: "tools.ozone.report.defs#reasonMisleadingSpam",
    DefsReasonRuleBanEvasion: "tools.ozone.report.defs#reasonRuleBanEvasion",
    DefsReasonSelfHarmStunts: "tools.ozone.report.defs#reasonSelfHarmStunts",
    DefsReasonSexualDeepfake: "tools.ozone.report.defs#reasonSexualDeepfake",
    DefsReasonViolenceAnimal: "tools.ozone.report.defs#reasonViolenceAnimal",
    DefsReasonChildSafetyCSAM: "tools.ozone.report.defs#reasonChildSafetyCSAM",
    DefsReasonHarassmentOther: "tools.ozone.report.defs#reasonHarassmentOther",
    DefsReasonHarassmentTroll: "tools.ozone.report.defs#reasonHarassmentTroll",
    DefsReasonMisleadingOther: "tools.ozone.report.defs#reasonMisleadingOther",
    DefsReasonSelfHarmContent: "tools.ozone.report.defs#reasonSelfHarmContent",
    DefsReasonSexualUnlabeled: "tools.ozone.report.defs#reasonSexualUnlabeled",
    DefsReasonViolenceThreats: "tools.ozone.report.defs#reasonViolenceThreats",
    DefsReasonChildSafetyGroom:
        "tools.ozone.report.defs#reasonChildSafetyGroom",
    DefsReasonChildSafetyOther:
        "tools.ozone.report.defs#reasonChildSafetyOther",
    DefsReasonRuleSiteSecurity:
        "tools.ozone.report.defs#reasonRuleSiteSecurity",
    DefsReasonHarassmentDoxxing:
        "tools.ozone.report.defs#reasonHarassmentDoxxing",
    DefsReasonChildSafetyPrivacy:
        "tools.ozone.report.defs#reasonChildSafetyPrivacy",
    DefsReasonHarassmentTargeted:
        "tools.ozone.report.defs#reasonHarassmentTargeted",
    DefsReasonSelfHarmSubstances:
        "tools.ozone.report.defs#reasonSelfHarmSubstances",
    DefsReasonSexualAbuseContent:
        "tools.ozone.report.defs#reasonSexualAbuseContent",
    DefsReasonMisleadingElections:
        "tools.ozone.report.defs#reasonMisleadingElections",
    DefsReasonRuleProhibitedSales:
        "tools.ozone.report.defs#reasonRuleProhibitedSales",
    DefsReasonViolenceTrafficking:
        "tools.ozone.report.defs#reasonViolenceTrafficking",
    DefsReasonHarassmentHateSpeech:
        "tools.ozone.report.defs#reasonHarassmentHateSpeech",
    DefsReasonChildSafetyHarassment:
        "tools.ozone.report.defs#reasonChildSafetyHarassment",
    DefsReasonViolenceGlorification:
        "tools.ozone.report.defs#reasonViolenceGlorification",
    DefsReasonViolenceGraphicContent:
        "tools.ozone.report.defs#reasonViolenceGraphicContent",
    DefsReasonMisleadingImpersonation:
        "tools.ozone.report.defs#reasonMisleadingImpersonation",
    DefsReasonViolenceExtremistContent:
        "tools.ozone.report.defs#reasonViolenceExtremistContent",
};

export class AtpBaseClient extends XrpcClient {
    app: AppNS;
    com: ComNS;
    net: NetNS;

    constructor(options: FetchHandler | FetchHandlerOptions) {
        super(options, schemas);
        this.app = new AppNS(this);
        this.com = new ComNS(this);
        this.net = new NetNS(this);
    }

    /** @deprecated use `this` instead */
    get xrpc(): XrpcClient {
        return this;
    }
}

export class AppNS {
    _client: XrpcClient;
    bsky: AppBskyNS;

    constructor(client: XrpcClient) {
        this._client = client;
        this.bsky = new AppBskyNS(client);
    }
}

export class AppBskyNS {
    _client: XrpcClient;
    actor: AppBskyActorNS;
    embed: AppBskyEmbedNS;
    feed: AppBskyFeedNS;
    graph: AppBskyGraphNS;
    richtext: AppBskyRichtextNS;

    constructor(client: XrpcClient) {
        this._client = client;
        this.actor = new AppBskyActorNS(client);
        this.embed = new AppBskyEmbedNS(client);
        this.feed = new AppBskyFeedNS(client);
        this.graph = new AppBskyGraphNS(client);
        this.richtext = new AppBskyRichtextNS(client);
    }
}

export class AppBskyActorNS {
    _client: XrpcClient;
    status: AppBskyActorStatusRecord;

    constructor(client: XrpcClient) {
        this._client = client;
        this.status = new AppBskyActorStatusRecord(client);
    }

    getProfile(
        params?: AppBskyActorGetProfile.QueryParams,
        opts?: AppBskyActorGetProfile.CallOptions,
    ): Promise<AppBskyActorGetProfile.Response> {
        return this._client.call(
            "app.bsky.actor.getProfile",
            params,
            undefined,
            opts,
        );
    }
}

export class AppBskyActorStatusRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: AppBskyActorStatus.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "app.bsky.actor.status",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{ uri: string; cid: string; value: AppBskyActorStatus.Record }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "app.bsky.actor.status",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<AppBskyActorStatus.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "app.bsky.actor.status";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            {
                collection,
                rkey: "self",
                ...params,
                record: { ...record, $type: collection },
            },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<AppBskyActorStatus.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "app.bsky.actor.status";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "app.bsky.actor.status", ...params },
            { headers },
        );
    }
}

export class AppBskyEmbedNS {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }
}

export class AppBskyFeedNS {
    _client: XrpcClient;
    postgate: AppBskyFeedPostgateRecord;
    threadgate: AppBskyFeedThreadgateRecord;

    constructor(client: XrpcClient) {
        this._client = client;
        this.postgate = new AppBskyFeedPostgateRecord(client);
        this.threadgate = new AppBskyFeedThreadgateRecord(client);
    }
}

export class AppBskyFeedPostgateRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: AppBskyFeedPostgate.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "app.bsky.feed.postgate",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: AppBskyFeedPostgate.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "app.bsky.feed.postgate",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<AppBskyFeedPostgate.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "app.bsky.feed.postgate";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<AppBskyFeedPostgate.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "app.bsky.feed.postgate";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "app.bsky.feed.postgate", ...params },
            { headers },
        );
    }
}

export class AppBskyFeedThreadgateRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: AppBskyFeedThreadgate.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "app.bsky.feed.threadgate",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: AppBskyFeedThreadgate.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "app.bsky.feed.threadgate",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<AppBskyFeedThreadgate.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "app.bsky.feed.threadgate";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<AppBskyFeedThreadgate.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "app.bsky.feed.threadgate";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "app.bsky.feed.threadgate", ...params },
            { headers },
        );
    }
}

export class AppBskyGraphNS {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    getFollowers(
        params?: AppBskyGraphGetFollowers.QueryParams,
        opts?: AppBskyGraphGetFollowers.CallOptions,
    ): Promise<AppBskyGraphGetFollowers.Response> {
        return this._client.call(
            "app.bsky.graph.getFollowers",
            params,
            undefined,
            opts,
        );
    }
}

export class AppBskyRichtextNS {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }
}

export class ComNS {
    _client: XrpcClient;
    atproto: ComAtprotoNS;

    constructor(client: XrpcClient) {
        this._client = client;
        this.atproto = new ComAtprotoNS(client);
    }
}

export class ComAtprotoNS {
    _client: XrpcClient;
    repo: ComAtprotoRepoNS;

    constructor(client: XrpcClient) {
        this._client = client;
        this.repo = new ComAtprotoRepoNS(client);
    }
}

export class ComAtprotoRepoNS {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }
}

export class NetNS {
    _client: XrpcClient;
    asadaame5121: NetAsadaame5121NS;

    constructor(client: XrpcClient) {
        this._client = client;
        this.asadaame5121 = new NetAsadaame5121NS(client);
    }
}

export class NetAsadaame5121NS {
    _client: XrpcClient;
    atCircle: NetAsadaame5121AtCircleNS;

    constructor(client: XrpcClient) {
        this._client = client;
        this.atCircle = new NetAsadaame5121AtCircleNS(client);
    }
}

export class NetAsadaame5121AtCircleNS {
    _client: XrpcClient;
    banner: NetAsadaame5121AtCircleBannerRecord;
    block: NetAsadaame5121AtCircleBlockRecord;
    member: NetAsadaame5121AtCircleMemberRecord;
    request: NetAsadaame5121AtCircleRequestRecord;
    ring: NetAsadaame5121AtCircleRingRecord;

    constructor(client: XrpcClient) {
        this._client = client;
        this.banner = new NetAsadaame5121AtCircleBannerRecord(client);
        this.block = new NetAsadaame5121AtCircleBlockRecord(client);
        this.member = new NetAsadaame5121AtCircleMemberRecord(client);
        this.request = new NetAsadaame5121AtCircleRequestRecord(client);
        this.ring = new NetAsadaame5121AtCircleRingRecord(client);
    }
}

export class NetAsadaame5121AtCircleBannerRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: NetAsadaame5121AtCircleBanner.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "net.asadaame5121.at-circle.banner",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: NetAsadaame5121AtCircleBanner.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "net.asadaame5121.at-circle.banner",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleBanner.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.banner";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleBanner.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.banner";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "net.asadaame5121.at-circle.banner", ...params },
            { headers },
        );
    }
}

export class NetAsadaame5121AtCircleBlockRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: NetAsadaame5121AtCircleBlock.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "net.asadaame5121.at-circle.block",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: NetAsadaame5121AtCircleBlock.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "net.asadaame5121.at-circle.block",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleBlock.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.block";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleBlock.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.block";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "net.asadaame5121.at-circle.block", ...params },
            { headers },
        );
    }
}

export class NetAsadaame5121AtCircleMemberRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: NetAsadaame5121AtCircleMember.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "net.asadaame5121.at-circle.member",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: NetAsadaame5121AtCircleMember.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "net.asadaame5121.at-circle.member",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleMember.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.member";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleMember.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.member";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "net.asadaame5121.at-circle.member", ...params },
            { headers },
        );
    }
}

export class NetAsadaame5121AtCircleRequestRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: {
            uri: string;
            value: NetAsadaame5121AtCircleRequest.Record;
        }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "net.asadaame5121.at-circle.request",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: NetAsadaame5121AtCircleRequest.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "net.asadaame5121.at-circle.request",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleRequest.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.request";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleRequest.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.request";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "net.asadaame5121.at-circle.request", ...params },
            { headers },
        );
    }
}

export class NetAsadaame5121AtCircleRingRecord {
    _client: XrpcClient;

    constructor(client: XrpcClient) {
        this._client = client;
    }

    async list(
        params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
    ): Promise<{
        cursor?: string;
        records: { uri: string; value: NetAsadaame5121AtCircleRing.Record }[];
    }> {
        const res = await this._client.call("com.atproto.repo.listRecords", {
            collection: "net.asadaame5121.at-circle.ring",
            ...params,
        });
        return res.data;
    }

    async get(
        params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
    ): Promise<{
        uri: string;
        cid: string;
        value: NetAsadaame5121AtCircleRing.Record;
    }> {
        const res = await this._client.call("com.atproto.repo.getRecord", {
            collection: "net.asadaame5121.at-circle.ring",
            ...params,
        });
        return res.data;
    }

    async create(
        params: OmitKey<
            ComAtprotoRepoCreateRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleRing.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.ring";
        const res = await this._client.call(
            "com.atproto.repo.createRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async put(
        params: OmitKey<
            ComAtprotoRepoPutRecord.InputSchema,
            "collection" | "record"
        >,
        record: Un$Typed<NetAsadaame5121AtCircleRing.Record>,
        headers?: Record<string, string>,
    ): Promise<{ uri: string; cid: string }> {
        const collection = "net.asadaame5121.at-circle.ring";
        const res = await this._client.call(
            "com.atproto.repo.putRecord",
            undefined,
            { collection, ...params, record: { ...record, $type: collection } },
            { encoding: "application/json", headers },
        );
        return res.data;
    }

    async delete(
        params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
        headers?: Record<string, string>,
    ): Promise<void> {
        await this._client.call(
            "com.atproto.repo.deleteRecord",
            undefined,
            { collection: "net.asadaame5121.at-circle.ring", ...params },
            { headers },
        );
    }
}
