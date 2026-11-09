import { html } from "hono/html";

export type RingRowData = {
    title: string;
    uri: string;
    description?: string | null;
    acceptance_policy?: string | null;
    member_count?: number | null;
};

/** リング一覧の1行（◆ 名前・人数・参加方式 / 説明）。トップと「リングを探す」で共用 */
export const RingRow = ({
    ring,
    t,
}: {
    ring: RingRowData;
    t: (key: string, options?: any) => string;
}) => {
    const manual = ring.acceptance_policy !== "auto";
    return html`
        <li class="rt-ring-row">
            <span class="rt-ring-head">
                <span class="rt-mark" aria-hidden="true">◆</span>
                <a href="/rings/view?ring=${encodeURIComponent(ring.uri)}" class="rt-ring-name">${ring.title}</a>
                <span class="rt-ring-meta">${t("rings.member_count", { count: ring.member_count ?? 0 })}</span>
                <span class="rt-tag ${manual ? "rt-tag-manual" : "rt-tag-auto"}">${t(manual ? "rings.policy_manual" : "rings.policy_auto")}</span>
            </span>
            ${ring.description ? html`<span class="rt-ring-desc">${ring.description}</span>` : ""}
        </li>
    `;
};
