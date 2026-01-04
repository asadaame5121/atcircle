import { validate as _validate } from "../../../../lexicons";
import { is$typed as _is$typed, type $Typed } from "../../../../util";
import type * as AppBskyEmbedExternal from "../embed/external.js";

const is$typed = _is$typed,
    validate = _validate;
const id = "app.bsky.actor.status";
/** Advertises an account as currently offering live content. */
export const LIVE = `${id}#live`;

export interface Main {
    $type: "app.bsky.actor.status";
    embed?: $Typed<AppBskyEmbedExternal.Main> | { $type: string };
    /** The status for the account. */
    status: "app.bsky.actor.status#live" | (string & {});
    createdAt: string;
    /** The duration of the status in minutes. Applications can choose to impose minimum and maximum limits. */
    durationMinutes?: number;
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
