import { html } from "hono/html";
import { LoginForm } from "./LoginForm.js";

interface HomeViewProps {
    t: (key: string, options?: any) => string;
}

/** 未ログインのトップ：見出し・3ステップ・ログインフォームだけの1画面 */
export const HomeView = ({ t }: HomeViewProps) => {
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
    `;
};
