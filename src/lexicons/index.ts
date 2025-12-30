/**
 * GENERATED CODE - DO NOT MODIFY
 */
// @ts-nocheck
import {
    type FetchHandler,
    type FetchHandlerOptions,
    XrpcClient,
} from "@atproto/xrpc";
import { schemas } from "./lexicons.js";
import type * as NetAsadaame5121AtCircleBanner from "./types/net/asadaame5121/at-circle/banner.js";
import type * as NetAsadaame5121AtCircleBlock from "./types/net/asadaame5121/at-circle/block.js";
import type * as NetAsadaame5121AtCircleMember from "./types/net/asadaame5121/at-circle/member.js";
import type * as NetAsadaame5121AtCircleRequest from "./types/net/asadaame5121/at-circle/request.js";
import type * as NetAsadaame5121AtCircleRing from "./types/net/asadaame5121/at-circle/ring.js";
import type { OmitKey, Un$Typed } from "./util.js";

export * as NetAsadaame5121AtCircleBanner from "./types/net/asadaame5121/at-circle/banner.js";
export * as NetAsadaame5121AtCircleBlock from "./types/net/asadaame5121/at-circle/block.js";
export * as NetAsadaame5121AtCircleDefs from "./types/net/asadaame5121/at-circle/defs.js";
export * as NetAsadaame5121AtCircleMember from "./types/net/asadaame5121/at-circle/member.js";
export * as NetAsadaame5121AtCircleRequest from "./types/net/asadaame5121/at-circle/request.js";
export * as NetAsadaame5121AtCircleRing from "./types/net/asadaame5121/at-circle/ring.js";

export class AtpBaseClient extends XrpcClient {
    net: NetNS;

    constructor(options: FetchHandler | FetchHandlerOptions) {
        super(options, schemas);
        this.net = new NetNS(this);
    }

    /** @deprecated use `this` instead */
    get xrpc(): XrpcClient {
        return this;
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
