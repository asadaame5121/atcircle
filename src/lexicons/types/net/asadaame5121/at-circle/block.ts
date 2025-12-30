import { validate as _validate } from "../../../../lexicons";
import { is$typed as _is$typed } from "../../../../util";
import type * as NetAsadaame5121AtCircleDefs from "./defs.js";

const is$typed = _is$typed,
    validate = _validate;
const id = "net.asadaame5121.at-circle.block";

export interface Main {
    $type: "net.asadaame5121.at-circle.block";
    /** DID of the member to block */
    subject: string;
    ring: NetAsadaame5121AtCircleDefs.RingRef;
    /** Reason for blocking */
    reason?: string;
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
    type Main as Record,
    isMain as isRecord,
    validateMain as validateRecord,
};
