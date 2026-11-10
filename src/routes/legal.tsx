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
            <h1 class="rt-h1">■ ${t("legal.terms_title")} ■</h1>
            <article class="rt-prose">
                ${raw(t("legal.terms_content"))}
            </article>
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
            <h1 class="rt-h1">■ ${t("legal.privacy_title")} ■</h1>
            <article class="rt-prose">
                ${raw(t("legal.privacy_content"))}
            </article>
        `,
        }),
    );
});

export default app;
