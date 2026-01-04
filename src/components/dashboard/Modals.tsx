import { html } from "hono/html";
import { MemberModals } from "./modals/MemberModals.js";
import { RingModals } from "./modals/RingModals.js";
import { Scripts } from "./modals/Scripts.js";
import { UsageModals } from "./modals/UsageModals.js";
import { UserModals } from "./modals/UserModals.js";

interface ModalsProps {
    site: any;
    t: (key: string, options?: any) => string;
}

export const Modals = ({ site, t }: ModalsProps) => {
    return html`
        ${RingModals({ site, t })}
        ${UsageModals({ t })}
        ${MemberModals({ t })}
        ${UserModals({ t })}
        ${Scripts({ t })}
    `;
};
