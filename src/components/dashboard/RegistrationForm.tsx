import { html } from "hono/html";

export const RegistrationForm = (props: {
    discoveryStatus: string;
    detectedSites: any[];
    defaultSite: any;
    t: (key: string, options?: any) => string;
}) => {
    const { discoveryStatus, detectedSites, defaultSite, t } = props;

    return html`
        <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
            <div class="card-body">
                <h1 class="card-title text-3xl mb-4 text-center justify-center">${t("dashboard.register_title")}</h1>
                <p class="text-center opacity-75">${t("dashboard.register_desc")}</p>
                <div class="text-center mb-6">
                    <div class="dropdown dropdown-hover dropdown-center">
                        <label tabindex="0" class="btn btn-ghost btn-xs text-primary low-case gap-1">
                            <i class="fa-solid fa-circle-info"></i> What is AT-Proto?
                        </label>
                        <div tabindex="0" class="dropdown-content z-1 card card-compact w-64 p-2 shadow bg-base-100 border border-base-200 text-xs">
                            <div class="card-body">
                                <p>${t("dashboard.atproto_help")}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${
                    discoveryStatus
                        ? html`
                    <div class="alert alert-info mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>${discoveryStatus}</span>
                    </div>
                `
                        : ""
                }

                <form action="/dashboard/site" method="POST" id="registerForm">
                    
                    ${
                        detectedSites.length > 1
                            ? html`
                        <div class="form-control mb-6">
                            <label class="label">
                                <span class="label-text font-bold">${t("dashboard.detected_sites")}</span>
                            </label>
                            <div class="space-y-2">
                                ${detectedSites.map(
                                    (site, index) => html`
                                    <label class="label cursor-pointer justify-start gap-4 border p-3 rounded-lg hover:bg-base-200 transition-colors">
                                        <input type="radio" name="site_selection" class="radio radio-primary" 
                                            value="${index}" 
                                            ${index === 0 ? "checked" : ""}
                                            onchange="selectSite(${index})"
                                        />
                                        <div class="flex-1">
                                            <div class="font-bold">${site.url}</div>
                                            ${site.title ? html`<div class="text-xs opacity-70">${site.title}</div>` : ""}
                                        </div>
                                    </label>
                                `,
                                )}
                                <label class="label cursor-pointer justify-start gap-4 border p-3 rounded-lg hover:bg-base-200 transition-colors">
                                    <input type="radio" name="site_selection" class="radio radio-primary" value="-1" onchange="clearForm()" />
                                    <span class="font-bold">${t("dashboard.enter_manually")}</span>
                                </label>
                            </div>
                        </div>
                    `
                            : ""
                    }

                    <div class="form-control w-full mb-4">
                        <label class="label">
                            <span class="label-text font-bold">${t("dashboard.site_url")}</span>
                        </label>
                        <input type="url" name="url" id="url" required value="${defaultSite.url}" class="input input-bordered w-full" />
                    </div>

                    <div class="form-control w-full mb-4">
                        <label class="label">
                            <span class="label-text font-bold">${t("dashboard.site_title")}</span>
                        </label>
                        <input type="text" name="title" id="title" required value="${defaultSite.title || ""}" class="input input-bordered w-full" />
                    </div>

                    <div class="form-control w-full mb-4">
                        <label class="label">
                            <span class="label-text font-bold">${t("dashboard.modal_description")}</span>
                        </label>
                        <textarea name="description" class="textarea textarea-bordered h-24"></textarea>
                    </div>

                    <div class="form-control w-full mb-8">
                        <label class="label">
                            <span class="label-text font-bold">RSS Feed URL (${t("common.optional")})</span>
                        </label>
                        <input type="url" name="rss_url" id="rss_url" value="${defaultSite.rss || ""}" class="input input-bordered w-full" placeholder="https://example.com/feed.xml" />
                    </div>

                    <div class="card-actions justify-center flex-col gap-4">
                        <button type="submit" class="btn btn-primary w-full text-lg">${t("dashboard.btn_register_site")}</button>
                        <div class="text-center w-full">
                            <a href="/logout" class="link link-hover text-sm">${t("common.logout")}</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <script>
            const sites = ${JSON.stringify(detectedSites)};
            
            function selectSite(index) {
                const site = sites[index];
                document.getElementById('url').value = site.url || '';
                document.getElementById('title').value = site.title || '';
                document.getElementById('rss_url').value = site.rss || '';
            }

            function clearForm() {
                document.getElementById('url').value = '';
                document.getElementById('title').value = '';
                document.getElementById('rss_url').value = '';
            }
        </script>
    `;
};
