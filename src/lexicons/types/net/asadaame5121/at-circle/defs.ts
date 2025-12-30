import { validate as _validate } from "../../../../lexicons";
import { is$typed as _is$typed } from "../../../../util";

const is$typed = _is$typed,
    validate = _validate;
const id = "net.asadaame5121.at-circle.defs";

export interface RingRef {
    $type?: "net.asadaame5121.at-circle.defs#ringRef";
    /** AT-URI of the Ring */
    uri: string;
    /** Optional CID for strong reference */
    cid?: string;
}

const hashRingRef = "ringRef";

export function isRingRef<V>(v: V) {
    return is$typed(v, id, hashRingRef);
}

export function validateRingRef<V>(v: V) {
    return validate<RingRef & V>(v, id, hashRingRef);
}
