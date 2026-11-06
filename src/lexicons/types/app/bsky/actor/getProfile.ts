import type { HeadersMap } from "@atproto/xrpc";
import { validate as _validate } from "../../../../lexicons.js";
import { is$typed as _is$typed } from "../../../../util.js";
import type * as AppBskyActorDefs from "./defs.js";

const is$typed = _is$typed,
    validate = _validate;
const _id = "app.bsky.actor.getProfile";

export type QueryParams = {
    /** Handle or DID of account to fetch profile of. */
    actor: string;
};
export type InputSchema = undefined;
export type OutputSchema = AppBskyActorDefs.ProfileViewDetailed;

export interface CallOptions {
    signal?: AbortSignal;
    headers?: HeadersMap;
}

export interface Response {
    success: boolean;
    headers: HeadersMap;
    data: OutputSchema;
}

export function toKnownErr(e: any) {
    return e;
}
