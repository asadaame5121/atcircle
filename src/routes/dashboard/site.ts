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
            children: html`
                <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                    <div class="card-body">
                        <h1 class="card-title text-2xl mb-6">${t(
                            "dashboard.edit_site",
                        )}</h1>
                        <form action="/dashboard/site/update" method="POST">
                            <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text font-bold"
                                    >${t("dashboard.site_url")}</span></label>
                                <input
                                    type="url"
                                    name="url"
                                    value="${site.url}"
                                    required
                                    class="input input-bordered w-full"
                                />
                            </div>
                            <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text font-bold"
                                    >${t("dashboard.site_title")}</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    value="${site.title}"
                                    required
                                    class="input input-bordered w-full"
                                />
                            </div>
                            <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text font-bold"
                                    >${t(
                                        "dashboard.modal_description",
                                    )}</span></label>
                                <textarea
                                    name="description"
                                    class="textarea textarea-bordered h-24"
                                >${site.description || ""}</textarea>
                            </div>
                            <div class="form-control w-full mb-8">
                                <label class="label"><span class="label-text font-bold"
                                    >RSS Feed URL</span></label>
                                <input
                                    type="url"
                                    name="rss_url"
                                    value="${site.rss_url || ""}"
                                    class="input input-bordered w-full"
                                />
                            </div>
                            <div class="card-actions justify-between">
                                <a href="/dashboard" class="btn btn-ghost">${t(
                                    "common.back",
                                )}</a>
                                <button type="submit" class="btn btn-primary">
                                    ${t("common.save")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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
