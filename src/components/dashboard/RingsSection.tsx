import { html } from "hono/html";

export const RingsSection = (props: {
    unifiedRings: any[];
    did: string;
    t: (key: string, options?: any) => string;
}) => {
    const { unifiedRings, did, t } = props;

    if (unifiedRings.length === 0) {
        return html`
            <div class="card bg-base-100 shadow-sm border border-dashed border-base-300 p-12 text-center">
                <div class="text-4xl mb-4 opacity-30">🌐</div>
                <h3 class="font-bold text-lg mb-2">${t("dashboard.no_rings")}</h3>
                <p class="text-sm opacity-60 mb-6">まだ参加しているリングがありません。<br/>既存のリングを探してみませんか？</p>
                <a href="/rings" class="btn btn-primary btn-sm rounded-full px-8 mx-auto">${t("common.rings")}</a>
            </div>
        `;
    }

    return html`
        <div class="space-y-4">
            ${unifiedRings.map(
                (r) => html`
                <div class="card bg-base-200 shadow-sm border border-base-300">
                    <div class="card-body p-5">
                        <div class="flex justify-between items-start">
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 mb-2">
                                    <h3 class="font-bold text-lg break-all lg:break-normal leading-tight">
                                        <a href="/rings/view?ring=${encodeURIComponent(r.uri)}" class="link hover:link-primary">${r.title}</a>
                                    </h3>
                                    <div class="flex flex-wrap gap-1">
                                        ${r.isAdmin ? html`<span class="badge badge-primary badge-outline badge-xs whitespace-nowrap">${t("dashboard.owner")}</span>` : ""}
                                        ${r.memberCount !== undefined ? html`<span class="badge badge-ghost badge-xs opacity-50 whitespace-nowrap">${t("rings.member_count", { count: r.memberCount })}</span>` : ""}
                                        ${r.pendingCount > 0 ? html`<span class="badge badge-warning badge-xs whitespace-nowrap">${t("dashboard.pending_count", { count: r.pendingCount })}</span>` : ""}
                                    </div>
                                </div>
                                <p class="text-sm opacity-70 mb-2">${r.description || html`<span class="italic opacity-50">${t("dashboard.no_description")}</span>`}</p>
                                
                                <div class="flex flex-wrap gap-2 items-center text-xs opacity-50 font-mono mb-3">
                                    <span class="break-all">URI: ${r.uri}</span>
                                </div>

                                ${
                                    r.isAdmin
                                        ? html`
                                    <div class="flex flex-wrap gap-2 mb-2">
                                        <button class="btn btn-ghost btn-xs bg-base-300/50 hover:bg-base-300" onclick="window.copyInviteLinkFromBtn(this)" data-uri="${r.uri}">
                                            <i class="fa-solid fa-copy mr-1 opacity-70"></i> ${t("dashboard.copy_invite_link")}
                                        </button>
                                        <button class="btn btn-ghost btn-xs bg-base-300/50 hover:bg-base-300" onclick="window.openMemberModalFromBtn(this)" data-uri="${r.uri}" data-title="${r.title}">
                                            <i class="fa-solid fa-users mr-1 opacity-70"></i> ${t("dashboard.manage_members")}
                                        </button>
                                        <button class="btn btn-ghost btn-xs bg-base-300/50 hover:bg-base-300" onclick="window.openInviteModalFromBtn(this)" data-uri="${r.uri}" data-title="${r.title}">
                                            <i class="fa-solid fa-user-plus mr-1 opacity-70"></i> ${t("dashboard.invite_friends")}
                                        </button>
                                        <button class="btn btn-ghost btn-xs bg-base-300/50 hover:bg-base-300" 
                                            onclick="window.openConfigModalFromBtn(this)" 
                                            data-uri="${r.uri}" 
                                            data-title="${r.title}" 
                                            data-description="${r.description || ""}" 
                                            data-status="${r.status}" 
                                            data-acceptance="${r.acceptancePolicy}" 
                                            data-admin="${r.adminDid || did}" 
                                            data-slug="${r.slug || ""}" 
                                            data-banner="${r.bannerUrl || ""}">
                                            <i class="fa-solid fa-gear mr-1 opacity-70"></i> ${t("dashboard.configure_ring")}
                                        </button>
                                    </div>
                                `
                                        : ""
                                }
                            </div>
                        </div>

                        ${
                            r.isMember
                                ? html`
                            <div class="mt-4 pt-4 border-t border-base-300 flex justify-between items-center bg-base-300/30 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                                <div class="text-xs">
                                    <span class="opacity-50">${t("dashboard.joined_as")}:</span> <a href="${r.siteUrl}" target="_blank" class="link hover:link-primary font-medium">${r.siteUrl}</a>
                                </div>
                                <div class="flex gap-2">
                                    <a href="/dashboard/ring/widget?ring_uri=${encodeURIComponent(r.uri)}" class="btn btn-primary btn-xs gap-1" target="_blank">
                                        <i class="fa-solid fa-code text-[10px]"></i>
                                        ${t("dashboard.get_code")}
                                    </a>
                                    <form action="/dashboard/ring/leave" method="POST" onsubmit="return confirm('${t("dashboard.confirm_leave")}')">
                                        <input type="hidden" name="uri" value="${r.memberUri}" />
                                        <button type="submit" class="btn btn-xs btn-error btn-outline">${t("dashboard.leave")}</button>
                                    </form>
                                </div>
                            </div>
                        `
                                : ""
                        }
                    </div>
                </div>
            `,
            )}
        </div>
    `;
};
