import { html } from "hono/html";

export const LegacySiteSection = (props: {
    site: any;
    t: (key: string, options?: any) => string;
}) => {
    const { site, t } = props;

    return html`
        <div class="divider">${t("dashboard.legacy")}</div>
        <div class="bg-base-200 p-6 rounded-lg mb-6 opacity-75">
            <h2 class="text-xl font-bold mb-4">${t("dashboard.legacy_site")}</h2>
            <div class="space-y-2">
                <p><span class="font-semibold">${t("dashboard.site_title")}:</span> ${site.title}</p>
                <p><span class="font-semibold">${t("dashboard.site_url")}:</span> <a href="${site.url}" target="_blank" class="link link-primary">${site.url}</a></p>
                ${site.rss_url ? html`<p><span class="font-semibold">RSS:</span> ${site.rss_url}</p>` : ""}
                <p><span class="font-semibold">${t("dashboard.status")}:</span> 
                    <span class="badge ${site.is_active ? "badge-success" : "badge-ghost"}">${site.is_active ? t("dashboard.status_active") : t("dashboard.status_inactive")}</span>
                </p>
            </div>
            <div class="card-actions mt-6">
                <a href="/dashboard/site/edit" class="btn btn-success btn-sm">${t("dashboard.edit_site")}</a>
                <a href="/dashboard/site/debug" class="btn btn-ghost btn-xs opacity-50">${t("dashboard.inspector")}</a>
            </div>
        </div>
    `;
};
