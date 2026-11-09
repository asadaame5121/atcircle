import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { HomeView } from "../components/HomeView.js";
import { Layout } from "../components/Layout.js";
import { SESSION_COOKIE } from "../lib/session.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
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
            guest: true,
            children: HomeView({ t }),
        }),
    );
});

export default app;
