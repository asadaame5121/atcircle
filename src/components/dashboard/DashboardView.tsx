import { html } from "hono/html";
import { safeHref } from "../../lib/html.js";
import { Modals } from "./Modals.js";
import { ModerationSection } from "./ModerationSection.js";

type T = (key: string, params?: any) => string;

interface DashboardViewProps {
    site: any;
    unifiedRings: any[];
    joinRequests: any[];
    pendingMemberships: any[];
    blocks: any[];
    did: string;
    isAdmin: boolean;
    /** 直前の操作結果（?msg=） */
    msg?: string;
    t: T;
}

/** ?msg= で表示してよいメッセージ（locale の dashboard.msg_*） */
const FLASH_MESSAGES = new Set([
    "created",
    "joined",
    "left",
    "updated",
    "approved",
    "rejected",
    "deleted",
    "registered",
    "synced",
    "unblocked",
    "slug_taken",
    "already_joined_or_requested",
]);

const RingMenu = ({ r, did, t }: { r: any; did: string; t: T }) => html`
    <details class="rt-menu">
        <summary aria-label="${t("dash.menu_label", { ring: r.title })}" class="rt-bevel rt-menu-btn">…</summary>
        <div class="rt-menu-list">
            <button type="button" onclick="window.copyUriFromBtn(this)" data-uri="${r.uri}">${t("dash.copy_uri")}</button>
            ${
                r.isAdmin
                    ? html`
                <button type="button" onclick="window.copyInviteLinkFromBtn(this)" data-uri="${r.uri}">${t("dash.copy_invite")}</button>
                <button type="button" onclick="window.openMemberModalFromBtn(this)" data-uri="${r.uri}" data-title="${r.title}">${t("dash.manage")}</button>
                <button type="button"
                    onclick="window.openConfigModalFromBtn(this)"
                    data-uri="${r.uri}"
                    data-title="${r.title}"
                    data-description="${r.description || ""}"
                    data-status="${r.status}"
                    data-acceptance="${r.acceptancePolicy}"
                    data-admin="${r.adminDid || did}"
                    data-slug="${r.slug || ""}"
                    data-banner="${r.bannerUrl || ""}">${t("dash.config")}</button>
            `
                    : ""
            }
            ${
                r.isMember || r.isPendingRequest
                    ? html`
                <form action="/dashboard/ring/leave" method="POST" data-confirm="${t(r.isPendingRequest ? "dash.confirm_withdraw" : "dashboard.confirm_leave")}">
                    <input type="hidden" name="uri" value="${r.isPendingRequest ? r.requestUri : r.memberUri}" />
                    <button type="submit" class="rt-danger">${t(r.isPendingRequest ? "dash.withdraw" : "dash.leave")}</button>
                </form>
            `
                    : ""
            }
        </div>
    </details>
`;

const RingItem = ({ r, did, t }: { r: any; did: string; t: T }) => html`
    <article class="rt-dash-ring">
        <div class="rt-dash-ring-main">
            <h3 class="rt-dash-ring-title">
                <a href="/rings/view?ring=${encodeURIComponent(r.uri)}">${r.title}</a>
                <span class="rt-ring-meta">${t("dash.meta", {
                    role: t(r.isAdmin ? "dash.role_owner" : "dash.role_member"),
                    count: r.memberCount ?? 0,
                })}</span>
            </h3>
            ${r.description ? html`<p class="rt-dash-ring-desc">${r.description}</p>` : ""}
            ${r.isPendingRequest ? html`<p class="rt-dash-ring-note"><span class="rt-tag rt-tag-manual">${t("dash.pending_tag")}</span></p>` : ""}
            ${r.pendingCount > 0 ? html`<p class="rt-dash-ring-note"><b><a href="#requests">${t("dash.requests_link", { count: r.pendingCount })}</a></b></p>` : ""}
        </div>
        <div class="rt-dash-ring-actions">
            ${r.isMember ? html`<a href="/dashboard/ring/widget?ring_uri=${encodeURIComponent(r.uri)}" class="rt-bevel">${t("dash.widget")}</a>` : ""}
            ${RingMenu({ r, did, t })}
        </div>
    </article>
`;

export const DashboardView = ({
    site,
    unifiedRings,
    joinRequests,
    pendingMemberships,
    blocks,
    did,
    isAdmin,
    msg,
    t,
}: DashboardViewProps) => {
    return html`
        <h1 class="rt-h1">■ ${t("dash.title")} ■</h1>
        ${msg && FLASH_MESSAGES.has(msg) ? html`<p class="rt-flash" role="status">★ ${t(`dashboard.msg_${msg}`)} ★</p>` : ""}
        <div class="rt-actions">
            <a href="/rings" class="rt-bevel rt-go">${t("dash.find")}</a>
            <a href="/rings/new" class="rt-bevel">${t("dash.create")}</a>
        </div>

        <section aria-label="${t("dash.site_label")}" class="rt-panel rt-dash-site">
            <span class="rt-dash-site-main">
                <b>${site.title}</b>
                <a href="${safeHref(site.url, "#")}" target="_blank" rel="noopener noreferrer">${site.url}</a>
                <span class="rt-tag ${site.is_active ? "rt-tag-auto" : "rt-tag-off"}">${t(site.is_active ? "dash.active" : "dash.inactive")}</span>
            </span>
            <a href="/dashboard/site/edit" class="rt-small">${t("dash.settings")}</a>
        </section>

        ${ModerationSection({ joinRequests, pendingMemberships, blocks, t })}

        <section class="rt-box" aria-labelledby="my-rings-title">
            <h2 id="my-rings-title" class="rt-box-title">${t("dash.rings_title")}</h2>
            ${
                unifiedRings.length > 0
                    ? unifiedRings.map((r) => RingItem({ r, did, t }))
                    : html`<p class="rt-empty">${t("dash.empty")}　<a href="/rings">${t("dash.find")}</a></p>`
            }
        </section>

        <details class="rt-box rt-advanced">
            <summary class="rt-box-title">${t("dash.more")}</summary>
            <div class="rt-advanced-body rt-more">
                <form action="/dashboard/sync" method="POST">
                    <button type="submit" class="rt-bevel rt-block">${t("dashboard.sync_from_pds")}</button>
                </form>
                <form action="/logout" method="POST">
                    <button type="submit" class="rt-bevel rt-block">${t("common.logout")}</button>
                </form>
                ${isAdmin ? html`<p><a href="/dashboard/admin/stats">Admin Stats</a></p>` : ""}
                <p class="rt-note">${t("dashboard.leave_warning")}</p>
                <button type="button" class="rt-bevel rt-block rt-danger" onclick="leave_modal.showModal()">${t("dashboard.delete_account_button")}</button>
                <p class="rt-note rt-did">${did}</p>
            </div>
        </details>

        ${Modals({ site, t })}
    `;
};
