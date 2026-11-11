import { html } from "hono/html";

export type RingRowData = {
    title: string;
    uri: string;
    description?: string | null;
    acceptance_policy?: string | null;
    member_count?: number | null;
};

export const isManualRing = (ring: { acceptance_policy?: string | null }) =>
    ring.acceptance_policy === "manual";

/**
 * リング一覧の1行（◆ 名前・人数・参加方式 / 説明）。トップと「リングを探す」で共用。
 * href を省くとリング詳細へリンクする。selected は「リングを探す」で選択中の行。
 */
export const RingRow = ({
    ring,
    t,
    href,
    selected = false,
}: {
    ring: RingRowData;
    t: (key: string, options?: any) => string;
    href?: string;
    selected?: boolean;
}) => {
    const manual = isManualRing(ring);
    const link = href ?? `/rings/view?ring=${encodeURIComponent(ring.uri)}`;
    return html`
        <li class="rt-ring-row${selected ? " rt-ring-row-selected" : ""}">
            <span class="rt-ring-head">
                <span class="rt-mark" aria-hidden="true">${selected ? "▶" : "◆"}</span>
                <a href="${link}" class="rt-ring-name"${selected ? html` aria-current="true"` : ""}>${ring.title}</a>
                <span class="rt-ring-meta">${t("rings.member_count", { count: ring.member_count ?? 0 })}</span>
                <span class="rt-tag ${manual ? "rt-tag-manual" : "rt-tag-auto"}">${t(manual ? "rings.policy_manual" : "rings.policy_auto")}</span>
            </span>
            ${ring.description ? html`<span class="rt-ring-desc">${ring.description}</span>` : ""}
        </li>
    `;
};
