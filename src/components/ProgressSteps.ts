import { html } from "hono/html";

/** ログイン後の画面上部に出す進み具合（STEP1 ログイン ▶ STEP2 リングに入る ▶ STEP3 ウィジェット） */
export const ProgressSteps = ({
    current,
    t,
}: {
    current: 2 | 3;
    t: (key: string, options?: any) => string;
}) => {
    const steps = [t("find.step1"), t("find.step2"), t("find.step3")];
    return html`
        <ol aria-label="${t("find.progress_label")}" class="rt-progress">
            ${steps.map((label, i) => {
                const n = i + 1;
                const item =
                    n < current
                        ? html`<li class="rt-progress-done"><s>${label}</s></li>`
                        : n === current
                          ? html`<li aria-current="step" class="rt-progress-now">${label}</li>`
                          : html`<li>${label}</li>`;
                return n < steps.length
                    ? html`${item}<li aria-hidden="true" class="rt-progress-sep">▶</li>`
                    : item;
            })}
        </ol>
    `;
};
