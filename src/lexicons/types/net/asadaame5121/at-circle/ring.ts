import { validate as _validate } from "../../../../lexicons";
import { is$typed as _is$typed } from "../../../../util";

const is$typed = _is$typed,
    validate = _validate;
const id = "net.asadaame5121.at-circle.ring";

export interface Main {
    $type: "net.asadaame5121.at-circle.ring";
    /** Name of the circle */
    title: string;
    /** Description of the circle */
    description?: string;
    /** DID of the ring administrator */
    admin: string;
    /** Recruitment status */
    status: "open" | "closed" | (string & {});
    /** How new members are accepted */
    acceptancePolicy?: "automatic" | "manual" | (string & {});
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
