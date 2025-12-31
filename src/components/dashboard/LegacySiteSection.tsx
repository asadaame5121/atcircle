import { html } from "hono/html";

export const LegacySiteSection = (props: {
    site: any;
    t: (key: string, options?: any) => string;
}) => {
    const { site, t } = props;

    return html`
        <div class="divider">${t("dashboard.site_basic_settings")}</div>
        <div class="card bg-base-100 shadow-sm border border-base-200">
            <div class="card-body p-6">
                <h2 class="card-title text-xl font-bold mb-4">${t("dashboard.legacy_site")}</h2>
            <div class="space-y-2">
                <p><span class="font-semibold">${t("dashboard.site_title")}:</span> ${site.title}</p>
                <p><span class="font-semibold">${t("dashboard.site_url")}:</span> <a href="${site.url}" target="_blank" class="link link-primary">${site.url}</a></p>
                ${site.rss_url ? html`<p><span class="font-semibold">RSS:</span> ${site.rss_url}</p>` : ""}
                <p><span class="font-semibold">${t("dashboard.status")}:</span> 
                    <span class="badge ${site.is_active ? "badge-success" : "badge-ghost"}">${site.is_active ? t("dashboard.status_active") : t("dashboard.status_inactive")}</span>
                </p>
            </div>
                <div class="card-actions mt-6">
                    <a href="/dashboard/site/edit" class="btn btn-primary btn-sm rounded-full">${t("dashboard.edit_site")}</a>
                    <a href="/dashboard/site/debug" class="btn btn-ghost btn-xs opacity-50 ml-auto">${t("dashboard.inspector")}</a>
                </div>
            </div>
        </div>
    `;
};
