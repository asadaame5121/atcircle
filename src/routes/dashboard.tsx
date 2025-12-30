import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { html } from "hono/html";
import { verify } from "hono/jwt";
import { LegacySiteSection } from "../components/dashboard/LegacySiteSection.js";
import { Modals } from "../components/dashboard/Modals.js";
import { ModerationSection } from "../components/dashboard/ModerationSection.js";
import { RegistrationForm } from "../components/dashboard/RegistrationForm.js";
import { RingsSection } from "../components/dashboard/RingsSection.js";
import { Layout } from "../components/Layout.js";
import { PUBLIC_URL, SECRET_KEY } from "../config.js";
import {
    AtProtoService,
    type MemberRecord,
    type RingRecord,
} from "../services/atproto.js";
import { fetchAndDiscoverMetadata } from "../services/discovery.js";
import { restoreAgent } from "../services/oauth.js";
import type { AppVariables, Bindings } from "../types/bindings.js";
import moderationApp from "./dashboard/moderation.js";
// Sub-apps
import ringApp from "./dashboard/rings.js";
import siteApp from "./dashboard/site.js";
import syncApp from "./dashboard/sync.js";
import userApp from "./dashboard/user.js";
import widgetBuilder from "./widget_builder.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Protected Route Middleware
app.use("*", async (c, next) => {
    const token = getCookie(c, "session");
    if (!token) {
        const url = new URL(c.req.url);
        return c.redirect(
            `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
        );
    }
    try {
        const payload = await verify(token, SECRET_KEY);
        c.set("jwtPayload", payload);
        await next();
    } catch (_e) {
        return c.redirect("/login");
    }
});

// Mounting Sub-apps
app.route("/ring/widget", widgetBuilder);
app.route("/ring", ringApp);
app.route("/ring", moderationApp); // Both use /ring prefix
app.route("/site", siteApp);
app.route("/sync", syncApp);
app.route("/", userApp);

app.get("/", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    const t = c.get("t");
    const lang = c.get("lang");

    const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);

    // --- Data Fetching ---
    let myRings: { uri: string; cid: string; value: RingRecord }[] = [];
    let myMemberships: { uri: string; cid: string; value: MemberRecord }[] = [];

    if (agent) {
        try {
            [myRings, myMemberships] = await Promise.all([
                AtProtoService.listRings(agent, did),
                AtProtoService.listMemberRecords(agent, did),
            ]);
        } catch (e) {
            console.error("Failed to list ATProto data:", e);
        }
    }

    const site = (await c.env.DB.prepare(
        "SELECT * FROM sites WHERE user_did = ?",
    )
        .bind(did)
        .first()) as any;

    // --- Auto-Discovery Flow if no site ---
    if (!site) {
        let discoveryStatus = "";
        const detectedSites: { url: string; title?: string; rss?: string }[] =
            [];

        try {
            const profileRes = await fetch(
                `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${did}`,
            );
            if (profileRes.ok) {
                const profile = (await profileRes.json()) as {
                    description?: string;
                };
                const desc = profile.description || "";
                const urls = Array.from(
                    desc.matchAll(/https?:\/\/[^\s]+/g),
                    (m) => m[0],
                );

                if (urls.length > 0) {
                    discoveryStatus = t("dashboard.discovery_found", {
                        count: urls.length,
                    });
                    for (const url of urls.slice(0, 3)) {
                        try {
                            const meta = await fetchAndDiscoverMetadata(url);
                            if (meta) {
                                detectedSites.push({
                                    url: meta.url,
                                    title: meta.title,
                                    rss:
                                        meta.feeds.length > 0
                                            ? meta.feeds[0].url
                                            : "",
                                });
                            } else {
                                detectedSites.push({ url });
                            }
                        } catch (_e) {
                            detectedSites.push({ url });
                        }
                    }
                } else {
                    discoveryStatus = t("dashboard.discovery_not_found");
                }
            }
        } catch (_e) {
            discoveryStatus = t("dashboard.discovery_failed");
        }

        const defaultSite =
            detectedSites.length > 0
                ? detectedSites[0]
                : { url: "", title: "", rss: "" };

        return c.html(
            Layout({
                title: t("dashboard.register_title"),
                t,
                lang,
                children: RegistrationForm({
                    discoveryStatus,
                    detectedSites,
                    defaultSite,
                    t,
                }),
            }),
        );
    }

    // --- Main Dashboard Logic (Site Exists) ---

    // 1. Process Rings Data
    const ringMap = new Map<string, any>();
    for (const r of myRings) {
        ringMap.set(r.uri, {
            uri: r.uri,
            title: r.value.title,
            description: r.value.description || "",
            status: r.value.status || "open",
            isAdmin: true,
            isMember: false,
            adminDid: r.value.admin || did,
            acceptancePolicy: r.value.acceptancePolicy || "automatic",
            pendingCount: 0,
        });
    }

    for (const m of myMemberships) {
        const ringUri = m.value.ring.uri;
        const existing = ringMap.get(ringUri);
        if (existing) {
            existing.isMember = true;
            existing.memberUri = m.uri;
            existing.siteUrl = m.value.url;
        } else {
            ringMap.set(ringUri, {
                uri: ringUri,
                title: "Loading...",
                isMember: true,
                memberUri: m.uri,
                siteUrl: m.value.url,
            });
        }
    }

    // Supplement with local DB data
    const localRings = (await c.env.DB.prepare(
        "SELECT * FROM rings",
    ).all()) as any;
    for (const local of localRings.results) {
        const ring = ringMap.get(local.uri);
        if (ring) {
            ring.title = local.title;
            ring.description = local.description;
            ring.status = local.status;
            ring.acceptancePolicy = local.acceptance_policy;
            if (local.admin_did === did) ring.isAdmin = true;
        }
    }

    // 2. Fetch Moderation Data
    const [joinRequests, pendingMemberships, blocks] = await Promise.all([
        c.env.DB.prepare(`
            SELECT jr.*, r.title as ring_title 
            FROM join_requests jr 
            JOIN rings r ON jr.ring_uri = r.uri 
            WHERE (r.owner_did = ? OR r.admin_did = ?) AND jr.status = 'pending'
        `)
            .bind(did, did)
            .all(),
        c.env.DB.prepare(`
            SELECT m.member_uri, s.title as site_title, s.url as site_url, r.title as ring_title 
            FROM memberships m 
            JOIN sites s ON m.site_id = s.id 
            JOIN rings r ON m.ring_uri = r.uri 
            WHERE (r.owner_did = ? OR r.admin_did = ?) AND m.status = 'pending'
        `)
            .bind(did, did)
            .all(),
        c.env.DB.prepare(`
            SELECT b.*, r.title as ring_title, u.handle as user_handle
            FROM block_records b
            JOIN rings r ON b.ring_uri = r.uri
            LEFT JOIN users u ON b.subject_did = u.did
            WHERE r.owner_did = ? OR r.admin_did = ?
        `)
            .bind(did, did)
            .all(),
    ]);

    // Update pending counts for ring items
    for (const jr of joinRequests.results as any[]) {
        const ring = ringMap.get(jr.ring_uri);
        if (ring) ring.pendingCount = (ring.pendingCount || 0) + 1;
    }
    for (const pm of pendingMemberships.results as any[]) {
        const localRing = localRings.results.find(
            (r: any) => r.title === pm.ring_title,
        );
        if (localRing) {
            const ring = ringMap.get(localRing.uri);
            if (ring) ring.pendingCount = (ring.pendingCount || 0) + 1;
        }
    }

    const unifiedRings = Array.from(ringMap.values());

    return c.html(
        Layout({
            title: t("dashboard.title"),
            t,
            lang,
            children: html`
            <div class="space-y-8">
                <div class="flex justify-between items-center bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                    <div>
                        <h1 class="text-3xl font-black italic tracking-tighter text-primary">DASHBOARD</h1>
                        <p class="text-sm opacity-50 font-mono">${did}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-primary btn-sm rounded-full px-6" onclick="create_ring_modal.showModal()">+ ${t("dashboard.create_ring")}</button>
                        <button class="btn btn-outline btn-sm rounded-full" onclick="join_ring_modal.showModal()">${t("dashboard.join_ring")}</button>
                    </div>
                </div>

                ${ModerationSection({
                    joinRequests: joinRequests.results || [],
                    pendingMemberships: pendingMemberships.results || [],
                    blocks: blocks.results || [],
                    t,
                })}

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2">
                        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            ${t("dashboard.my_rings")}
                        </h2>
                        ${RingsSection({ unifiedRings, did, t })}
                    </div>

                    <div class="space-y-6">
                        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                            ${t("dashboard.my_site")}
                        </h2>
                        ${LegacySiteSection({ site, t })}

                        <div class="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                             <form action="/dashboard/sync" method="POST">
                                <button type="submit" class="btn btn-ghost btn-sm w-full gap-2 opacity-70 hover:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    ${t("dashboard.sync_from_pds")}
                                </button>
                            </form>
                            <form action="/logout" method="POST" class="mt-4">
                                <button type="submit" class="btn btn-ghost btn-sm btn-error w-full gap-2 opacity-50 hover:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    ${t("common.logout")}
                                </button>
                            </form>
                        </div>

                        <div class="card bg-error/5 border border-error/10 p-4">
                            <h3 class="text-xs font-bold text-error uppercase mb-2">${t("dashboard.danger_zone")}</h3>
                            <button class="btn btn-error btn-xs btn-outline w-full" onclick="leave_modal.showModal()">${t("dashboard.delete_account_button")}</button>
                        </div>
                    </div>
                </div>

                ${Modals({ site, t })}
            </div>
        `,
        }),
    );
});

export default app;
