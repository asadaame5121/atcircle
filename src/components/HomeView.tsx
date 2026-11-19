import { html } from "hono/html";
import { LoginForm } from "./LoginForm.js";
import { RingRow, type RingRowData } from "./RingRow.js";

interface HomeViewProps {
    previewRings: RingRowData[];
    t: (key: string, options?: any) => string;
}

/** 未ログインのトップ：見出し・3ステップ・ログインフォームと、公開中のリング */
export const HomeView = ({ previewRings, t }: HomeViewProps) => {
    return html`
        <h1 class="rt-h1">${t("home.headline_1")}<br>${t("home.headline_2")}</h1>
        <div class="rt-home">
            <ol class="rt-box rt-steps">
                <li class="rt-box-title">${t("home.steps_label")}</li>
                <li class="rt-step rt-step-now"><span aria-hidden="true" class="rt-mark">▶</span> <b>STEP1</b> ${t("home.step_login")}</li>
                <li class="rt-step"><span aria-hidden="true" class="rt-mark">◆</span> <b>STEP2</b> ${t("home.step_join")}</li>
                <li class="rt-step"><span aria-hidden="true" class="rt-mark">◆</span> <b>STEP3</b> ${t("home.step_widget")}</li>
            </ol>
            <section aria-label="${t("common.login")}" class="rt-home-login">
                ${LoginForm({ t })}
            </section>
        </div>
        ${
            previewRings.length > 0
                ? html`
        <section class="rt-box rt-home-rings" aria-labelledby="preview-rings-title">
            <h2 id="preview-rings-title" class="rt-box-title">${t("home.preview_title")}</h2>
            <ul class="rt-ring-list">
                ${previewRings.map((ring) => RingRow({ ring, t }))}
            </ul>
            <p class="rt-box-foot"><a href="/rings">${t("home.preview_more")}</a></p>
        </section>
        `
                : ""
        }
    `;
};
