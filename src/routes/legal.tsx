import { Hono } from "hono";
import { html, raw } from "hono/html";
import { Layout } from "../components/Layout.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/terms", (c) => {
    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: t("legal.terms_title"),
            t,
            lang,
            children: html`
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body prose">
                    <h1 class="card-title text-3xl mb-6">${t("legal.terms_title")}</h1>
                    ${raw(t("legal.terms_content"))}
                </div>
            </div>
            <div class="text-center mt-8">
               <a href="/" class="btn btn-ghost">${t("common.back_to_home")}</a>
            </div>
        `,
        }),
    );
});

app.get("/privacy", (c) => {
    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: t("legal.privacy_title"),
            t,
            lang,
            children: html`
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body prose">
                    <h1 class="card-title text-3xl mb-6">${t("legal.privacy_title")}</h1>
                    ${raw(t("legal.privacy_content"))}
                </div>
            </div>
            <div class="text-center mt-8">
               <a href="/" class="btn btn-ghost">${t("common.back_to_home")}</a>
            </div>
        `,
        }),
    );
});

export default app;
