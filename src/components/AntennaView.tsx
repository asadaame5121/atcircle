import { html } from "hono/html";
import type { AntennaItem } from "../repositories/antenna.repository.js";

interface AntennaViewProps {
    items: AntennaItem[];
    ringInfo: { title: string } | null;
    ringUri: string | undefined;
    t: (key: string, options?: any) => string;
}

export const AntennaView = ({
    items,
    ringInfo,
    ringUri,
    t,
}: AntennaViewProps) => {
    return html`
        <div class="card bg-base-100 shadow-xl max-w-4xl mx-auto">
            <div class="card-body">
                <div class="flex justify-between items-end mb-6">
                    <div>
                        <h1 class="card-title text-4xl mb-1">${ringInfo ? ringInfo.title : t("antenna.global_title")}</h1>
                        <p class="opacity-70">${ringInfo ? t("antenna.ring_desc") : t("antenna.global_desc")}</p>
                    </div>
                    ${ringUri ? html`<a href="/rings/view?ring=${encodeURIComponent(ringUri)}" class="btn btn-ghost btn-sm">${t("common.back")}</a>` : ""}
                </div>
                
                ${
                    items && items.length > 0
                        ? html`
                    <div class="space-y-6">
                        ${items.map(
                            (item) => html`
                            <div class="flex gap-4 group">
                                <div class="hidden md:flex flex-col items-center">
                                    <div class="w-1 bg-base-300 flex-1 group-first:bg-transparent"></div>
                                    <div class="w-4 h-4 rounded-full border-2 border-primary bg-base-100"></div>
                                    <div class="w-1 bg-base-300 flex-1 group-last:bg-transparent"></div>
                                </div>
                                <div class="flex-1 pb-8">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="text-xs font-mono opacity-40 uppercase">${new Date(item.published_at * 1000).toLocaleDateString()}</span>
                                        <div class="h-1 w-1 bg-base-300 rounded-full"></div>
                                        <a href="${item.site_url}" target="_blank" class="text-xs font-bold link link-hover opacity-60 hover:opacity-100">
                                            ${item.site_title}
                                        </a>
                                    </div>
                                    <h3 class="text-xl font-bold mb-2">
                                        <a href="${item.item_url}" target="_blank" class="hover:text-primary transition-colors">
                                            ${item.item_title}
                                        </a>
                                    </h3>
                                </div>
                            </div>
                        `,
                        )}
                    </div>
                `
                        : html`
                    <div class="alert alert-ghost border-2 border-dashed py-12 flex flex-col gap-4 text-center">
                        <span class="text-4xl" role="img" aria-label="Empty mailbox">📭</span>
                        <div>
                            <p class="font-bold">${t("antenna.no_updates")}</p>
                            <p class="text-sm opacity-60">${t("antenna.no_updates_desc")}</p>
                        </div>
                    </div>
                `
                }
            </div>
        </div>
    `;
};
