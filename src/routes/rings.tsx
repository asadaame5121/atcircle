import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../components/Layout.js";
import { injectMockData } from "../scripts/mock_data.js";
import { generateOpml } from "../services/opml.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Temporary Debug route to inject mock data
app.post("/debug/mock-data", async (c) => {
    const ringUri = (await c.req.parseBody()).ring_uri as string;
    const t = c.get("t");
    if (!ringUri)
        return c.text(t("error.missing_ring_uri") || "Missing ring URI", 400);

    await injectMockData(c.env.DB, ringUri);
    return c.redirect(`/rings/view?ring=${encodeURIComponent(ringUri)}`);
});

// List all rings
app.get("/", async (c) => {
    const rings = await c.env.DB.prepare(`
        SELECT r.*, 
               (SELECT COUNT(*) FROM memberships m WHERE m.ring_uri = r.uri AND m.status = 'approved') as member_count 
        FROM rings r 
        WHERE r.status = 'open'
        ORDER BY created_at DESC
    `).all<any>();

    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: t("rings.explore_title"),
            t,
            lang,
            children: html`
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="card-title text-3xl">${t("rings.explore_title")}</h1>
                        <a href="/dashboard" class="btn btn-primary btn-sm">${t("dashboard.create_ring")}</a>
                    </div>
                    <p class="mb-6 opacity-75">${t("rings.explore_desc")}</p>
                
                 ${
                     rings.results && rings.results.length > 0
                         ? html`
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${rings.results.map(
                            (ring) => html`
                            <div class="card bg-base-200 shadow-sm border border-base-300 transition-all hover:border-primary/50">
                                <div class="card-body p-6">
                                    <div class="flex justify-between items-start mb-2">
                                        <h2 class="card-title text-xl font-bold">${ring.title}</h2>
                                        <div class="badge badge-secondary">${t("rings.member_count", { count: ring.member_count })}</div>
                                    </div>
                                    <p class="text-sm opacity-60 mb-2">${t("rings.by", { did: ring.owner_did })}</p>
                                    <p class="text-base mb-4 line-clamp-2">${ring.description || t("common.no_description")}</p>
                                    <div class="card-actions justify-end mt-2">
                                        <a href="/rings/view?ring=${encodeURIComponent(ring.uri)}" class="btn btn-sm btn-outline btn-primary">${t("rings.view_sites")}</a>
                                        <a href="/nav/random?ring=${encodeURIComponent(ring.uri)}" class="btn btn-sm btn-circle btn-ghost" title="${t("rings.random_jump")}">🎲</a>
                                    </div>
                                </div>
                            </div>
                        `,
                        )}
                    </div>
                 `
                         : html`<div class="alert alert-info">${t("rings.no_rings_found")}</div>`
                 }

                 <div class="card-actions justify-center mt-8">
                    <a href="/" class="btn btn-ghost">${t("common.back_to_home")}</a>
                 </div>
                </div>
            </div>
        `,
        }),
    );
});

// View sites in a specific ring
app.get("/view", async (c) => {
    const ringUri = c.req.query("ring");
    if (!ringUri) return c.redirect("/rings");

    // Fetch ring info
    const ring = await c.env.DB.prepare("SELECT * FROM rings WHERE uri = ?")
        .bind(ringUri)
        .first<any>();
    if (!ring) return c.redirect("/rings");

    // Fetch members
    const members = await c.env.DB.prepare(`
        SELECT s.*, m.member_uri
        FROM sites s
        JOIN memberships m ON s.id = m.site_id
        WHERE m.ring_uri = ? AND s.is_active = 1 AND m.status = 'approved'
        ORDER BY m.created_at ASC
    `)
        .bind(ringUri)
        .all<any>();

    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: `${ring.title} - Site List`,
            t,
            lang,
            children: html`
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <div class="text-sm breadcrumbs mb-4">
                        <ul>
                            <li><a href="/rings">${t("rings.explore_title")}</a></li>
                            <li>${ring.title}</li>
                        </ul>
                    </div>

                    <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                        <div class="flex-1">
                            <h1 class="card-title text-3xl mb-2">${ring.title}</h1>
                            <p class="opacity-75">${ring.description || t("common.no_description")}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <a href="/antenna?ring=${encodeURIComponent(ringUri)}" class="btn btn-outline btn-sm">📡 Antenna</a>
                            <a href="/rings/opml?ring=${encodeURIComponent(ringUri)}" class="btn btn-outline btn-sm">📦 OPML</a>
                            <a href="/nav/random?ring=${encodeURIComponent(ringUri)}" class="btn btn-primary btn-sm">${t("rings.random_jump")}</a>
                        </div>
                    </div>

                    <div class="divider">${t("rings.members_count_label", { count: members.results?.length || 0 })}</div>

                    ${
                        members.results && members.results.length > 0
                            ? html`
                        <div class="overflow-x-auto">
                            <table class="table table-zebra w-full text-sm">
                                <thead>
                                    <tr>
                                        <th>${t("common.site")}</th>
                                        <th>${t("common.description")}</th>
                                        <th>${t("common.actions")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${members.results.map(
                                        (site) => html`
                                        <tr>
                                            <td>
                                                <div class="font-bold">${site.title}</div>
                                                <div class="text-xs opacity-50 underline truncate max-w-[200px]"><a href="${site.url}" target="_blank">${site.url}</a></div>
                                            </td>
                                            <td class="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">${site.description || "-"}</td>
                                            <td>
                                                <div class="flex gap-2">
                                                    <a href="${site.url}" target="_blank" class="btn btn-xs btn-ghost">${t("common.visit")}</a>
                                                    ${site.rss_url ? html`<a href="${site.rss_url}" target="_blank" class="badge badge-warning badge-sm">RSS</a>` : ""}
                                                </div>
                                            </td>
                                        </tr>
                                    `,
                                    )}
                                </tbody>
                            </table>
                        </div>
                    `
                            : html`<div class="alert alert-ghost border-dashed">${t("rings.no_members_found")}</div>`
                    }

                    <div class="card-actions justify-center mt-12 gap-4">
                        <a href="/dashboard?ring_uri=${encodeURIComponent(ringUri)}" class="btn btn-secondary">${t("rings.join_this_ring")}</a>
                        <a href="/rings" class="btn btn-ghost">${t("common.back_to_list")}</a>
                    </div>
                </div>
            </div>
        `,
        }),
    );
});

// Export OPML for a specific ring
app.get("/opml", async (c) => {
    const ringUri = c.req.query("ring");
    if (!ringUri) return c.text("Missing ring URI", 400);

    const ring = await c.env.DB.prepare("SELECT title FROM rings WHERE uri = ?")
        .bind(ringUri)
        .first<any>();
    const members = await c.env.DB.prepare(`
        SELECT s.title, s.url, s.rss_url, s.description
        FROM sites s
        JOIN memberships m ON s.id = m.site_id
        WHERE m.ring_uri = ? AND s.is_active = 1 AND s.rss_url IS NOT NULL
    `)
        .bind(ringUri)
        .all<any>();

    const opml = generateOpml({
        title: ring ? `${ring.title} Members` : "ATcircle Members",
        outlines: (members.results || []).map((m) => ({
            text: m.title,
            title: m.title,
            type: "rss",
            xmlUrl: m.rss_url,
            htmlUrl: m.url,
            description: m.description,
        })),
    });

    c.header("Content-Type", "text/x-opml+xml");
    c.header(
        "Content-Disposition",
        `attachment; filename="ring-${encodeURIComponent(ring?.title || "members")}.opml"`,
    );
    return c.body(opml);
});

export default app;
