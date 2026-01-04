import { html } from "hono/html";

interface RingDetailViewProps {
    ring: any;
    members: any[];
    ringUri: string;
    t: (key: string, options?: any) => string;
}

export const RingDetailView = ({
    ring,
    members,
    ringUri,
    t,
}: RingDetailViewProps) => {
    return html`
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <div class="text-sm breadcrumbs mb-4">
                    <ul>
                        <li><a href="/rings">${t("rings.explore_title")}</a></li>
                        <li>${ring.title}</li>
                    </ul>
                </div>

                <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div class="flex-1">
                        ${
                            ring.banner_url
                                ? html`
                            <div class="mb-4 rounded-xl overflow-hidden shadow-sm aspect-3/1 max-h-[150px] w-full bg-base-200 border border-base-300">
                                <img src="${ring.banner_url}" alt="${ring.title}" class="w-full h-full object-contain" />
                            </div>
                        `
                                : ""
                        }
                        <h1 class="card-title text-3xl mb-2">${ring.title}</h1>
                        <p class="opacity-75">${ring.description || t("common.no_description")}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <a href="/antenna?ring=${encodeURIComponent(ringUri)}" class="btn btn-outline btn-sm">📡 Antenna</a>
                        <a href="/rings/opml?ring=${encodeURIComponent(ringUri)}" class="btn btn-outline btn-sm">📦 OPML</a>
                        <a href="/nav/random?ring=${encodeURIComponent(ringUri)}" class="btn btn-primary btn-sm">${t("rings.random_jump")}</a>
                    </div>
                </div>

                <div class="divider">${t("rings.members_count_label", { count: members?.length || 0 })}</div>

                ${
                    members && members.length > 0
                        ? html`
                    <div class="overflow-x-auto">
                        <table class="table table-zebra w-full text-sm">
                            <thead>
                                <tr>
                                    <th>${t("common.site")}</th>
                                    <th>${t("common.description")}</th>
                                    <th>${t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${members.map(
                                    (site) => html`
                                    <tr>
                                        <td>
                                            <div class="font-bold">${site.title}</div>
                                            <div class="text-xs opacity-50 underline truncate max-w-[200px]"><a href="${site.url}" target="_blank">${site.url}</a></div>
                                        </td>
                                        <td class="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">${site.description || "-"}</td>
                                        <td>
                                            <div class="flex gap-2">
                                                <a href="${site.url}" target="_blank" class="btn btn-xs btn-ghost">${t("common.visit")}</a>
                                                ${site.rss_url ? html`<a href="${site.rss_url}" target="_blank" class="badge badge-warning badge-sm">RSS</a>` : ""}
                                            </div>
                                        </td>
                                    </tr>
                                `,
                                )}
                            </tbody>
                        </table>
                    </div>
                `
                        : html`<div class="alert alert-ghost border-dashed">${t("rings.no_members_found")}</div>`
                }

                <div class="card-actions justify-center mt-12 gap-4">
                    <a href="/dashboard?ring=${encodeURIComponent(ringUri)}" class="btn btn-secondary">${t("rings.join_this_ring")}</a>
                    <a href="/rings" class="btn btn-ghost">${t("common.back_to_list")}</a>
                </div>
            </div>
        </div>
    `;
};
