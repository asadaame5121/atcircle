import { html } from "hono/html";
import { RingCard } from "./RingCard.js";

interface RingListViewProps {
    rings: any[];
    ownerLabels?: Record<string, string>;
    t: (key: string, options?: any) => string;
}

export const RingListView = ({ rings, ownerLabels, t }: RingListViewProps) => {
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
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    ${rings.map((ring) =>
                        RingCard({
                            ring,
                            ownerLabel: ownerLabels?.[ring.owner_did],
                            t,
                        }),
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
