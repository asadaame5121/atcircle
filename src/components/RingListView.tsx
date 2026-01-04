import { html } from "hono/html";

interface RingListViewProps {
    rings: any[];
    t: (key: string, options?: any) => string;
}

export const RingListView = ({ rings, t }: RingListViewProps) => {
    return html`
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <div class="flex justify-between items-center mb-6">
                    <h1 class="card-title text-3xl">${t("rings.explore_title")}</h1>
                    <a href="/dashboard" class="btn btn-primary btn-sm">${t("dashboard.create_ring")}</a>
                </div>
                <p class="mb-6 opacity-75">${t("rings.explore_desc")}</p>
            
             ${
                 rings && rings.length > 0
                     ? html`
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${rings.map(
                        (ring) => html`
                        <div class="card bg-base-200 shadow-sm border border-base-300 transition-all hover:border-primary/50">
                            <div class="card-body p-6">
                                <div class="flex justify-between items-start mb-2">
                                    <h2 class="card-title text-xl font-bold">${ring.title}</h2>
                                    <div class="badge badge-secondary">${t("rings.member_count", { count: ring.member_count })}</div>
                                </div>
                                <p class="text-sm opacity-60 mb-2">${t("rings.by", { did: ring.owner_did })}</p>
                                <p class="text-base mb-4 line-clamp-2">${ring.description || t("common.no_description")}</p>
                                <div class="card-actions justify-end mt-2">
                                    <a href="/rings/view?ring=${encodeURIComponent(ring.uri)}" class="btn btn-sm btn-outline btn-primary">${t("rings.view_sites")}</a>
                                    <a href="/nav/random?ring=${encodeURIComponent(ring.uri)}" class="btn btn-sm btn-circle btn-ghost" title="${t("rings.random_jump")}">🎲</a>
                                </div>
                            </div>
                        </div>
                    `,
                    )}
                </div>
             `
                     : html`<div class="alert alert-info">${t("rings.no_rings_found")}</div>`
             }

             <div class="card-actions justify-center mt-8">
                <a href="/" class="btn btn-ghost">${t("common.back_to_home")}</a>
             </div>
            </div>
        </div>
    `;
};
