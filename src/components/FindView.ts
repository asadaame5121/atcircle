import { html } from "hono/html";
import type { JoinContext } from "../services/find-rings.js";
import { ProgressSteps } from "./ProgressSteps.js";
import { isManualRing, RingRow, type RingRowData } from "./RingRow.js";

type T = (key: string, options?: any) => string;

const findUrl = (params: { q?: string; select?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.select) sp.set("select", params.select);
    const qs = sp.toString();
    return qs ? `/rings?${qs}` : "/rings";
};

/** 「探して参加」と「立ち上げる」の切り替え。立ち上げ画面でも使う */
export const RingEntryTabs = ({
    active,
    t,
}: {
    active: "find" | "create";
    t: T;
}) => html`
    <nav aria-label="${t("find.ways_label")}" class="rt-tabs">
        <a href="/rings" class="rt-bevel"${active === "find" ? html` aria-current="page"` : ""}>${t("find.tab_find")}</a>
        <a href="/rings/new" class="rt-bevel"${active === "create" ? html` aria-current="page"` : ""}>${t("find.tab_create")}</a>
    </nav>
`;

/** 流れる文字（新着）。「リングを探す」の1か所だけで使う */
export const RecentTicker = ({
    items,
    t,
}: {
    items: { kind: "ring" | "join"; title: string }[];
    t: T;
}) =>
    items.length === 0
        ? ""
        : html`
    <div class="rt-marquee" role="region" aria-label="${t("find.ticker_label")}" tabindex="0">
        <span><b class="rt-ticker-new">NEW!</b> ${items.map(
            (item) =>
                html`${t(
                    item.kind === "ring"
                        ? "find.ticker_new_ring"
                        : "find.ticker_new_join",
                    { title: item.title },
                )} ★ `,
        )}</span>
    </div>
`;

const JoinPanel = ({
    ring,
    loggedIn,
    join,
    q,
    t,
}: {
    ring: RingRowData | undefined;
    loggedIn: boolean;
    join: JoinContext | null;
    q: string;
    t: T;
}) => {
    if (!ring) {
        return html`<p class="rt-pick-prompt">${t("find.pick_prompt")}</p>`;
    }
    const manual = isManualRing(ring);
    const header = html`
        <h2 class="rt-join-title">★ ${ring.title}</h2>
        <p class="rt-join-meta">${t("find.meta", {
            count: ring.member_count ?? 0,
            policy: t(manual ? "rings.policy_manual" : "find.policy_auto_long"),
        })} ｜ <a href="/rings/view?ring=${encodeURIComponent(ring.uri)}">${t("find.view_sites")}</a></p>
    `;

    if (!loggedIn) {
        const next = findUrl({ q, select: ring.uri });
        return html`
            ${header}
            <a href="/login?next=${encodeURIComponent(next)}" class="rt-bevel rt-go rt-block">${t("find.login_to_join")}</a>
        `;
    }

    if (join?.joined) {
        return html`
            ${header}
            <p class="rt-join-done">${t("find.already")}</p>
            <a href="/dashboard" class="rt-bevel rt-block">${t("common.dashboard")}</a>
        `;
    }

    const site = join?.site;
    return html`
        ${header}
        <form action="/dashboard/ring/join" method="POST">
            <input type="hidden" name="ring_uri" value="${ring.uri}" />
            <label for="site-url" class="rt-label">${t("find.site_url")}</label>
            <input id="site-url" name="url" type="url" required value="${site?.url ?? ""}" placeholder="https://" class="rt-sunken rt-input" />
            <label for="site-name" class="rt-label">${t("find.site_name")}</label>
            <input id="site-name" name="title" type="text" required value="${site?.title ?? ""}" class="rt-sunken rt-input" />
            <details class="rt-rss"${site?.rss_url ? " open" : ""}>
                <summary>${t("find.add_rss")}</summary>
                <label for="site-rss" class="rt-label">${t("find.rss_url")}</label>
                <input id="site-rss" name="rss" type="url" value="${site?.rss_url ?? ""}" placeholder="https://" class="rt-sunken rt-input" />
            </details>
            <button type="submit" class="rt-bevel rt-go rt-block">${t(manual ? "find.request" : "find.join")}</button>
        </form>
    `;
};

export const FindView = ({
    rings,
    q,
    selectedUri,
    loggedIn,
    join,
    t,
}: {
    rings: RingRowData[];
    q: string;
    selectedUri?: string;
    loggedIn: boolean;
    join: JoinContext | null;
    t: T;
}) => {
    const selected = selectedUri
        ? rings.find((r) => r.uri === selectedUri)
        : undefined;
    return html`
        ${loggedIn ? ProgressSteps({ current: 2, t }) : ""}
        <h1 class="rt-h1">■ ${t("find.title")} ■</h1>
        ${RingEntryTabs({ active: "find", t })}
        <div class="rt-find">
            <section aria-label="${t("find.list_label")}" class="rt-find-list">
                <form action="/rings" method="GET" role="search">
                    <input type="search" name="q" value="${q}" aria-label="${t("find.search_label")}" placeholder="${t("find.search_placeholder")}" class="rt-sunken rt-input" />
                </form>
                <div class="rt-box">
                    <h2 class="rt-box-title">${t("find.list_title", { count: rings.length })}</h2>
                    ${
                        rings.length > 0
                            ? html`<ul class="rt-ring-list">${rings.map(
                                  (ring) =>
                                      RingRow({
                                          ring,
                                          t,
                                          href: `${findUrl({ q, select: ring.uri })}#join`,
                                          selected: ring.uri === selected?.uri,
                                      }),
                              )}</ul>`
                            : html`<p class="rt-empty">${t("find.not_found")}　<a href="/rings/new">${t("find.tab_create")}</a></p>`
                    }
                </div>
            </section>
            <aside id="join" aria-label="${t("find.join_label")}" class="rt-panel rt-find-join">
                ${JoinPanel({ ring: selected, loggedIn, join, q, t })}
            </aside>
        </div>
    `;
};
