import { Hono } from "hono";
import { Layout } from "../../components/Layout.js";
import { PUBLIC_URL } from "../../config.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/site
app.post("/", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const url = body.url as string;
    const title = body.title as string;
    const rss_url = body.rss_url as string;
    const description = body.description as string;

    if (!url || !title) return c.text("URL and Title required", 400);

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
            children: `
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body">
                    <h1 class="card-title text-2xl mb-6">${t(
                        "dashboard.edit_site",
                    )}</h1>
                    <form action="/dashboard/site/update" method="POST">
                        <div class="form-control w-full mb-4">
                            <label class="label"><span class="label-text font-bold">${t(
                                "dashboard.site_url",
                            )}</span></label>
                            <input type="url" name="url" value="${site.url}" required class="input input-bordered w-full" />
                        </div>
                        <div class="form-control w-full mb-4">
                            <label class="label"><span class="label-text font-bold">${t(
                                "dashboard.site_title",
                            )}</span></label>
                            <input type="text" name="title" value="${site.title}" required class="input input-bordered w-full" />
                        </div>
                        <div class="form-control w-full mb-4">
                            <label class="label"><span class="label-text font-bold">${t(
                                "dashboard.modal_description",
                            )}</span></label>
                            <textarea name="description" class="textarea textarea-bordered h-24">${
                                site.description || ""
                            }</textarea>
                        </div>
                        <div class="form-control w-full mb-8">
                            <label class="label"><span class="label-text font-bold">RSS Feed URL</span></label>
                            <input type="url" name="rss_url" value="${
                                site.rss_url || ""
                            }" class="input input-bordered w-full" />
                        </div>
                        <div class="card-actions justify-between">
                            <a href="/dashboard" class="btn btn-ghost">${t(
                                "common.back",
                            )}</a>
                            <button type="submit" class="btn btn-primary">${t(
                                "common.save",
                            )}</button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        }),
    );
});

// POST /dashboard/site/update
app.post("/update", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const url = body.url as string;
    const title = body.title as string;
    const rss_url = body.rss_url as string;
    const description = body.description as string;

    if (!url || !title) return c.text("URL and Title required", 400);

    await c.env.DB.prepare(
        "UPDATE sites SET url = ?, title = ?, rss_url = ?, description = ? WHERE user_did = ?",
    )
        .bind(url, title, rss_url || null, description || null, did)
        .run();

    return c.redirect("/dashboard?msg=updated");
});

// GET /dashboard/site/debug
app.get("/debug", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    const t = c.get("t");
    const lang = c.get("lang");

    const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);

    return c.html(
        Layout({
            title: "Debug - ATProto Session",
            t,
            lang,
            children: `
            <div class="card bg-base-100 shadow-xl max-w-4xl mx-auto font-mono text-xs">
                <div class="card-body">
                    <h1 class="card-title text-lg mb-4">ATProto Debug Info</h1>
                    <div class="space-y-4">
                        <section>
                            <h2 class="font-bold border-b mb-1">Session Info</h2>
                            <pre class="bg-base-200 p-2 rounded overflow-x-auto">${JSON.stringify(
                                {
                                    did,
                                    hasAgent: !!agent,
                                    serviceUrl: (
                                        agent as any
                                    )?.service?.toString(),
                                },
                                null,
                                2,
                            )}</pre>
                        </section>
                         <section>
                            <h2 class="font-bold border-b mb-1">Raw Session Header</h2>
                            <pre class="bg-base-200 p-2 rounded overflow-x-auto">session=${c.req.header(
                                "cookie",
                            )}</pre>
                        </section>
                        <div class="card-actions mt-4">
                            <a href="/dashboard" class="btn btn-sm btn-ghost">Back to Dashboard</a>
                        </div>
                    </div>
                </div>
            </div>
        `,
        }),
    );
});

export default app;
