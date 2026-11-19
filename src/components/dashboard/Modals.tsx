import { html } from "hono/html";
import { MemberModals } from "./modals/MemberModals.js";
import { RingModals } from "./modals/RingModals.js";
import { Scripts } from "./modals/Scripts.js";
import { UserModals } from "./modals/UserModals.js";

interface ModalsProps {
    site: any;
    t: (key: string, options?: any) => string;
}

export const Modals = ({ t }: ModalsProps) => {
    return html`
        ${RingModals({ t })}
        ${MemberModals({ t })}
        ${UserModals({ t })}
        ${Scripts({ t })}
    `;
};
