import { validate as _validate } from "../../../../lexicons.js";
import { is$typed as _is$typed } from "../../../../util.js";
import type * as ComAtprotoRepoStrongRef from "../../../com/atproto/repo/strongRef.js";

const is$typed = _is$typed,
    validate = _validate;
const id = "net.asadaame5121.at-circle.site";

export interface Main {
    $type: "net.asadaame5121.at-circle.site";
    /** URL of the site (http or https) */
    url: string;
    /** Title of the site */
    title: string;
    /** Short description of the site */
    description?: string;
    /** RSS or Atom feed URL */
    rss?: string;
    link?: ComAtprotoRepoStrongRef.Main;
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
