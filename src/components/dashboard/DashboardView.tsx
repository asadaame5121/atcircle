import { html } from "hono/html";
import { LegacySiteSection } from "./LegacySiteSection.js";
import { Modals } from "./Modals.js";
import { ModerationSection } from "./ModerationSection.js";
import { RingsSection } from "./RingsSection.js";

interface DashboardViewProps {
    site: any;
    unifiedRings: any[];
    joinRequests: any[];
    pendingMemberships: any[];
    blocks: any[];
    did: string;
    isAdmin: boolean;
    t: (key: string, params?: any) => string;
}

export const DashboardView = ({
    site,
    unifiedRings,
    joinRequests,
    pendingMemberships,
    blocks,
    did,
    isAdmin,
    t,
}: DashboardViewProps) => {
    return html`
        <div class="space-y-8">
            <div class="flex justify-between items-start md:items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 flex-wrap gap-4">
                <div>
                    <div class="flex items-center gap-3">
                        <h1 class="text-3xl font-black italic tracking-tighter text-primary">DASHBOARD</h1>
                        <button class="btn btn-circle btn-ghost btn-xs opacity-50 hover:opacity-100" onclick="usage_guide_modal.showModal()" title="${t("dashboard.usage_guide")}">
                            <i class="fa-solid fa-circle-question text-lg"></i>
                        </button>
                    </div>
                    <p class="text-sm font-bold opacity-80 mt-1">${t("dashboard.catchphrase")}</p>
                    <p class="text-[10px] opacity-30 font-mono mt-1">${did}</p>
                    ${
                        isAdmin
                            ? html`
                        <div class="mt-2 text-xs">
                            <a href="/dashboard/admin/stats" class="text-primary font-bold hover:underline">
                                <i class="fa-solid fa-chart-line mr-1"></i>
                                Admin Stats
                            </a>
                        </div>
                    `
                            : ""
                    }
                </div>

                <div class="flex gap-2 w-full md:w-auto">
                    <button class="btn btn-primary btn-sm rounded-full px-6 flex-1 md:flex-none" onclick="create_ring_modal.showModal()">+ ${t("dashboard.create_ring")}</button>
                    <button class="btn btn-outline btn-sm rounded-full flex-1 md:flex-none" onclick="join_ring_modal.showModal()">${t("dashboard.join_ring")}</button>
                </div>
            </div>

            <!-- Updates / News Section -->
            <div class="bg-primary/5 border border-primary/10 p-4 rounded-xl flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="bg-primary/10 p-2 rounded-lg text-primary">
                        <i class="fa-solid fa-bullhorn"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-primary">${t("dashboard.updates_title") || "Updates"}</h3>
                        <p class="text-xs opacity-70">${t("dashboard.updates_desc") || "Check the latest news and documentation."}</p>
                    </div>
                </div>
                <a href="https://asadaame5121.net/Article/AT%20CIRCLE.html" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm btn-circle" title="${t("common.visit")}">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>

            ${ModerationSection({
                joinRequests: joinRequests,
                pendingMemberships: pendingMemberships,
                blocks: blocks,
                t,
            })}

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2">
                    <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        ${t("dashboard.my_rings")}
                    </h2>
                    ${RingsSection({ unifiedRings, did, t })}
                </div>

                <div class="space-y-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        ${t("dashboard.my_site")}
                    </h2>
                    ${LegacySiteSection({ site, t })}

                    <div class="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                         <form action="/dashboard/sync" method="POST">
                            <button type="submit" class="btn btn-ghost btn-sm w-full gap-2 opacity-70 hover:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ${t("dashboard.sync_from_pds")}
                            </button>
                        </form>
                        <form action="/logout" method="POST" class="mt-4">
                            <button type="submit" class="btn btn-ghost btn-sm btn-error w-full gap-2 opacity-50 hover:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                ${t("common.logout")}
                            </button>
                        </form>
                    </div>

                    <div class="card bg-error/5 border border-error/10 p-4">
                        <h3 class="text-xs font-bold text-error uppercase mb-2">${t("dashboard.danger_zone")}</h3>
                        <button class="btn btn-error btn-xs btn-outline w-full" onclick="leave_modal.showModal()">${t("dashboard.delete_account_button")}</button>
                    </div>
                </div>
            </div>

            ${Modals({ site, t })}
        </div>
    `;
};
