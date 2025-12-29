import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { html } from "hono/html";
import { Layout } from "../components/Layout.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/", (c) => {
    const token = getCookie(c, "session");
    if (token) {
        return c.redirect("/dashboard");
    }
    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: `${t("common.brand")} - ${t("common.home")}`,
            t,
            lang,
            children: html`
      <div class="hero min-h-[50vh] bg-base-100 rounded-box shadow-xl">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <h1 class="text-5xl font-bold text-primary">${t("home.welcome")}</h1>
            <p class="py-6">${t("home.description")}</p>
            <a href="/login" class="btn btn-primary">${t("home.login_button")}</a>
          </div>
        </div>
      </div>
    `,
        }),
    );
});

export default app;
