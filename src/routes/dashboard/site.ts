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
