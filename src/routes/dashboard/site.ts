import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../../components/Layout.js";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import {
    siteRegistrationSchema,
    siteUpdateSchema,
} from "../../schemas/index.js";
import { restoreAgent } from "../../services/oauth.js";
import { SiteService } from "../../services/site.service.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

const PDS_WRITE_ERROR =
    "PDS への書き込みに失敗しました。ログインし直してから再度お試しください。";

/** フォームの link_uri / link_cid (選んだプロフィールのリンク)。本人のものだけ */
const profileLinkRef = (
    did: string,
    linkUri?: string,
    linkCid?: string,
): { uri: string; cid: string } | null => {
    if (!linkUri || !linkCid) return null;
    return linkUri.startsWith(`at://${did}/app.bsky.actor.link/`)
        ? { uri: linkUri, cid: linkCid }
        : null;
};

// POST /dashboard/site
app.post("/", zValidator("form", siteRegistrationSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { url, title, rss_url, description, link_uri, link_cid } =
        c.req.valid("form");

    const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
    if (!agent) return c.redirect("/login");

    try {
        await new SiteService(c.env.DB).saveMySite(agent, did, {
            url,
            title,
            description: description || null,
            rss: rss_url || null,
            link: profileLinkRef(did, link_uri, link_cid),
        });
    } catch (e) {
        pinoLogger.error({ msg: "Site registration failed (PDS)", error: e });
        return c.text(PDS_WRITE_ERROR, 502);
    }

    return c.redirect("/dashboard?msg=registered");
});

// GET /dashboard/site/edit
app.get("/edit", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    const t = c.get("t");
    const lang = c.get("lang");

    const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
    const site = await new SiteService(c.env.DB).getMySite(agent ?? null, did);

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

    const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
    if (!agent) return c.redirect("/login");

    try {
        // link は指定しない (既存レコードのものを引き継ぐ)
        await new SiteService(c.env.DB).saveMySite(agent, did, {
            url,
            title,
            description: description || null,
            rss: rss_url || null,
        });
    } catch (e) {
        pinoLogger.error({ msg: "Site update failed (PDS)", error: e });
        return c.text(PDS_WRITE_ERROR, 502);
    }

    return c.redirect("/dashboard?msg=updated");
});

export default app;
