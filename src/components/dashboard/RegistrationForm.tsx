import { html, raw } from "hono/html";

/** 検出したサイトの候補を選ぶと入力欄に反映する（値は data 属性から読む） */
const pickScript = `
(function () {
  var form = document.getElementById("registerForm");
  if (!form) return;
  form.addEventListener("change", function (e) {
    var r = e.target;
    if (r.name !== "site_selection") return;
    form.url.value = r.dataset.url || "";
    form.title.value = r.dataset.title || "";
    form.rss_url.value = r.dataset.rss || "";
  });
})();
`;

export const RegistrationForm = (props: {
    discoveryStatus: string;
    detectedSites: any[];
    defaultSite: any;
    t: (key: string, options?: any) => string;
}) => {
    const { discoveryStatus, detectedSites, defaultSite, t } = props;

    return html`
        <h1 class="rt-h1">■ ${t("dashboard.register_title")} ■</h1>
        <div class="rt-narrow rt-narrow-wide">
            ${discoveryStatus ? html`<p class="rt-flash" role="status">${discoveryStatus}</p>` : ""}
            <form action="/dashboard/site" method="POST" id="registerForm" class="rt-panel">
                ${
                    detectedSites.length > 1
                        ? html`
                <fieldset class="rt-fieldset">
                    <legend>${t("dashboard.detected_sites")}</legend>
                    ${detectedSites.map(
                        (site, index) => html`
                        <label class="rt-choice">
                            <input type="radio" name="site_selection" value="${index}" data-url="${site.url || ""}" data-title="${site.title || ""}" data-rss="${site.rss || ""}" ${index === 0 ? "checked" : ""} />
                            <span><b>${site.url}</b>${site.title ? html`<br><span class="rt-ring-meta">${site.title}</span>` : ""}</span>
                        </label>
                    `,
                    )}
                    <label class="rt-choice">
                        <input type="radio" name="site_selection" value="-1" data-url="" data-title="" data-rss="" />
                        <span>${t("dashboard.enter_manually")}</span>
                    </label>
                </fieldset>
                `
                        : ""
                }

                <label class="rt-label" for="url">${t("dashboard.site_url")}</label>
                <input type="url" name="url" id="url" required value="${defaultSite.url}" placeholder="https://" class="rt-sunken rt-input" />

                <label class="rt-label" for="title">${t("dashboard.site_title")}</label>
                <input type="text" name="title" id="title" required value="${defaultSite.title || ""}" class="rt-sunken rt-input" />

                <details class="rt-rss"${defaultSite.rss ? " open" : ""}>
                    <summary>${t("find.add_rss")}</summary>
                    <label class="rt-label" for="rss_url">${t("find.rss_url")}</label>
                    <input type="url" name="rss_url" id="rss_url" value="${defaultSite.rss || ""}" placeholder="https://example.com/feed.xml" class="rt-sunken rt-input" />
                </details>

                <label class="rt-label" for="description">${t("dashboard.modal_description")}（${t("common.optional")}）</label>
                <textarea name="description" id="description" rows="3" maxlength="500" class="rt-sunken rt-input rt-textarea"></textarea>

                <button type="submit" class="rt-bevel rt-go rt-block">${t("dashboard.btn_register_site")}</button>
            </form>
            <p class="rt-note">${t("dashboard.atproto_help")}</p>
            <form action="/logout" method="POST" class="rt-center">
                <button type="submit" class="rt-link-btn">${t("common.logout")}</button>
            </form>
        </div>
        <script>${raw(pickScript)}</script>
    `;
};
