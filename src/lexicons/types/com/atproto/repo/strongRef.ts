import { validate as _validate } from "../../../../lexicons.js";
import { is$typed as _is$typed } from "../../../../util.js";

const is$typed = _is$typed,
    validate = _validate;
const id = "com.atproto.repo.strongRef";

export interface Main {
    $type?: "com.atproto.repo.strongRef";
    cid: string;
    uri: string;
}

const hashMain = "main";

export function isMain<V>(v: V) {
    return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
    return validate<Main & V>(v, id, hashMain);
}
