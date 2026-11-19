import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../../components/Layout.js";
import {
    siteRegistrationSchema,
    siteUpdateSchema,
} from "../../schemas/index.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/site
app.post("/", zValidator("form", siteRegistrationSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { url, title, rss_url, description } = c.req.valid("form");

    await c.env.DB.prepare(
        "INSERT OR REPLACE INTO sites (user_did, url, title, rss_url, description, is_active) VALUES (?, ?, ?, ?, ?, 1)",
    )
        .bind(did, url, title, rss_url || null, description || null)
        .run();

    return c.redirect("/dashboard?msg=registered");
});

// GET /dashboard/site/edit
app.get("/edit", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    const t = c.get("t");
    const lang = c.get("lang");

    const site = (await c.env.DB.prepare(
        "SELECT * FROM sites WHERE user_did = ?",
    )
        .bind(did)
        .first()) as any;

    if (!site) return c.redirect("/dashboard");

    return c.html(
        Layout({
            title: t("dashboard.edit_site"),
            t,
            lang,
            current: "dashboard",
            children: html`
                <h1 class="rt-h1">■ ${t("dashboard.edit_site")} ■</h1>
                <form action="/dashboard/site/update" method="POST" class="rt-panel rt-narrow rt-narrow-wide">
                    <label class="rt-label" for="site-url">${t("dashboard.site_url")}</label>
                    <input id="site-url" type="url" name="url" value="${site.url}" required class="rt-sunken rt-input" />

                    <label class="rt-label" for="site-name">${t("dashboard.site_title")}</label>
                    <input id="site-name" type="text" name="title" value="${site.title}" required class="rt-sunken rt-input" />

                    <label class="rt-label" for="site-rss">${t("find.rss_url")}（${t("common.optional")}）</label>
                    <input id="site-rss" type="url" name="rss_url" value="${site.rss_url || ""}" class="rt-sunken rt-input" />

                    <label class="rt-label" for="site-desc">${t("dashboard.modal_description")}（${t("common.optional")}）</label>
                    <textarea id="site-desc" name="description" rows="3" maxlength="500" class="rt-sunken rt-input rt-textarea">${site.description || ""}</textarea>

                    <div class="rt-dialog-actions">
                        <a href="/dashboard" class="rt-bevel">${t("common.back")}</a>
                        <span class="rt-dialog-spacer"></span>
                        <button type="submit" class="rt-bevel rt-go">${t("common.save")}</button>
                    </div>
                </form>
            `,
        }),
    );
});

// POST /dashboard/site/update
app.post("/update", zValidator("form", siteUpdateSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { url, title, rss_url, description } = c.req.valid("form");

    await c.env.DB.prepare(
        "UPDATE sites SET url = ?, title = ?, rss_url = ?, description = ? WHERE user_did = ?",
    )
        .bind(url, title, rss_url || null, description || null, did)
        .run();

    return c.redirect("/dashboard?msg=updated");
});

export default app;
