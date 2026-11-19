import { html, raw } from "hono/html";
import type { JoinContext } from "../services/find-rings.js";
import { RingEntryTabs } from "./FindView.js";
import { ProgressSteps } from "./ProgressSteps.js";

type T = (key: string, options?: any) => string;

/** 入力に合わせてプレビューを書き換える（textContent のみ使う） */
const previewScript = `
(function () {
  var form = document.getElementById("create-ring-form");
  if (!form) return;
  var name = document.getElementById("preview-name");
  var desc = document.getElementById("preview-desc");
  var policy = document.getElementById("preview-policy");
  function update() {
    name.textContent = form.title.value.trim() || name.dataset.empty;
    desc.textContent = form.description.value.trim() || desc.dataset.empty;
    var manual = form.querySelector('input[name="acceptance_policy"]:checked');
    manual = manual && manual.value === "manual";
    policy.textContent = manual ? policy.dataset.manual : policy.dataset.auto;
    policy.className = "rt-tag " + (manual ? "rt-tag-manual" : "rt-tag-auto");
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
})();
`;

export const CreateView = ({
    site,
    t,
}: {
    site: JoinContext["site"];
    t: T;
}) => html`
    ${ProgressSteps({ current: 2, t })}
    <h1 class="rt-h1">■ ${t("find.title")} ■</h1>
    ${RingEntryTabs({ active: "create", t })}
    <div class="rt-find">
        <form id="create-ring-form" action="/dashboard/ring/create" method="POST" aria-label="${t("create.form_label")}" class="rt-panel rt-find-list">
            <label for="ring-name" class="rt-label">${t("create.ring_name")}</label>
            <input id="ring-name" name="title" type="text" required maxlength="100" placeholder="${t("create.ring_name_placeholder")}" class="rt-sunken rt-input" />
            <label for="ring-desc" class="rt-label">${t("create.description")}</label>
            <textarea id="ring-desc" name="description" rows="3" maxlength="500" placeholder="${t("create.description_placeholder")}" class="rt-sunken rt-input rt-textarea"></textarea>
            <fieldset class="rt-fieldset">
                <legend>${t("create.policy_legend")}</legend>
                <div class="rt-radios">
                    <label><input type="radio" name="acceptance_policy" value="automatic" checked />${t("find.policy_auto_long")}</label>
                    <label><input type="radio" name="acceptance_policy" value="manual" />${t("rings.policy_manual")}</label>
                </div>
            </fieldset>
            <label for="site-url" class="rt-label">${t("find.site_url")}</label>
            <input id="site-url" name="url" type="url" required value="${site?.url ?? ""}" placeholder="https://" class="rt-sunken rt-input" />
            <label for="site-name" class="rt-label">${t("find.site_name")}</label>
            <input id="site-name" name="site_title" type="text" required value="${site?.title ?? ""}" class="rt-sunken rt-input" />
            ${site?.rss_url ? html`<input type="hidden" name="rss" value="${site.rss_url}" />` : ""}
            <button type="submit" class="rt-bevel rt-go rt-block">${t("create.submit")}</button>
        </form>
        <aside aria-label="${t("create.preview")}" class="rt-box rt-find-join">
            <div class="rt-box-title">${t("create.preview")}</div>
            <ul class="rt-ring-list">
                <li class="rt-ring-row rt-ring-row-first">
                    <span class="rt-ring-head">
                        <span class="rt-mark" aria-hidden="true">◆</span>
                        <span id="preview-name" class="rt-ring-name rt-preview-name" data-empty="${t("create.ring_name")}">${t("create.ring_name")}</span>
                        <span class="rt-ring-meta">${t("rings.member_count", { count: 1 })}</span>
                        <span id="preview-policy" class="rt-tag rt-tag-auto" data-auto="${t("rings.policy_auto")}" data-manual="${t("rings.policy_manual")}">${t("rings.policy_auto")}</span>
                    </span>
                    <span id="preview-desc" class="rt-ring-desc" data-empty="${t("create.preview_desc_empty")}">${t("create.preview_desc_empty")}</span>
                </li>
            </ul>
        </aside>
    </div>
    <script>${raw(previewScript)}</script>
`;
