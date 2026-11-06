/**
 * GENERATED CODE - DO NOT MODIFY
 */
import type { BlobRef } from "@atproto/lexicon";
import { validate as _validate } from "../../../../lexicons.js";
import { is$typed as _is$typed } from "../../../../util.js";
import type * as NetAsadaame5121AtCircleDefs from "./defs.js";

const is$typed = _is$typed,
    validate = _validate;
const id = "net.asadaame5121.at-circle.banner";

export interface Main {
    $type: "net.asadaame5121.at-circle.banner";
    ring: NetAsadaame5121AtCircleDefs.RingRef;
    banner: BlobRef;
    createdAt: string;
    [k: string]: unknown;
}

const hashMain = "main";

export function isMain<V>(v: V) {
    return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
    return validate<Main & V>(v, id, hashMain, true);
}

export {
    isMain as isRecord,
    type Main as Record,
    validateMain as validateRecord,
};
