import { html } from "hono/html";

export const RingsSection = (props: {
    unifiedRings: any[];
    did: string;
    t: (key: string, options?: any) => string;
}) => {
    const { unifiedRings, did, t } = props;

    if (unifiedRings.length === 0) {
        return html`
            <div class="card bg-base-100 shadow-sm border border-dashed border-base-300 p-12 text-center opacity-70">
                <p>${t("dashboard.no_rings")}</p>
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
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="font-bold text-lg">${r.title}</h3>
                                    <div class="flex gap-1">
                                        ${r.isAdmin ? html`<span class="badge badge-primary badge-outline badge-xs">${t("dashboard.owner")}</span>` : ""}
                                        ${r.isMember ? html`<span class="badge badge-secondary badge-outline badge-xs">${t("dashboard.member")}</span>` : ""}
                                        ${r.pendingCount > 0 ? html`<span class="badge badge-warning badge-xs">${t("dashboard.pending_count", { count: r.pendingCount })}</span>` : ""}
                                    </div>
                                </div>
                                <p class="text-sm opacity-70 mb-2">${r.description || html`<span class="italic opacity-50">${t("dashboard.no_description")}</span>`}</p>
                                
                                <div class="flex flex-wrap gap-2 items-center text-xs opacity-50 font-mono">
                                    <span>URI: ${r.uri}</span>
                                </div>
                            </div>

                            <div class="flex gap-2">
                                ${
                                    r.isAdmin
                                        ? html`
                                    <button class="btn btn-ghost btn-sm btn-square" onclick="copyInviteLinkFromBtn(this)" data-uri="${r.uri}" title="${t("dashboard.copy_invite_link")}">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    </button>
                                    <button class="btn btn-ghost btn-sm btn-square" 
                                        onclick="openConfigModalFromBtn(this)" 
                                        data-uri="${r.uri}" 
                                        data-title="${r.title}" 
                                        data-description="${r.description || ""}" 
                                        data-status="${r.status}" 
                                        data-acceptance="${r.acceptancePolicy}" 
                                        data-admin="${r.adminDid || did}" 
                                        title="${t("dashboard.configure_ring")}">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
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
                                    <a href="/dashboard/ring/widget?ring_uri=${encodeURIComponent(r.uri)}" class="btn btn-primary btn-xs" target="_blank">${t("dashboard.widget")}</a>
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
