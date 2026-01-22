import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../../components/Layout.js";
import { AdminService } from "../../services/admin.service.js";
import { updateAllFeeds } from "../../services/feed.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// GET /dashboard/admin/stats
app.get("/stats", async (c) => {
    const payload = c.get("jwtPayload");
    const t = c.get("t");
    const lang = c.get("lang");

    if (payload?.role !== "admin") {
        return c.text("Forbidden", 403);
    }

    const [usersCount, sitesCount, ringsCount, membershipsCount] =
        await Promise.all([
            c.env.DB.prepare(
                "SELECT COUNT(*) as count FROM users",
            ).first<number>("count"),
            c.env.DB.prepare(
                "SELECT COUNT(*) as count FROM sites",
            ).first<number>("count"),
            c.env.DB.prepare(
                "SELECT COUNT(*) as count FROM rings",
            ).first<number>("count"),
            c.env.DB.prepare(
                "SELECT COUNT(*) as count FROM memberships WHERE status = 'approved'",
            ).first<number>("count"),
        ]);

    const recentUsers = await c.env.DB.prepare(
        "SELECT handle, did, created_at FROM users ORDER BY created_at DESC LIMIT 10",
    ).all();

    const msg = c.req.query("msg");

    return c.html(
        Layout({
            title: t("admin.stats_title"),
            t,
            lang,
            children: html`
                <div class="space-y-8">
                    ${msg === "sync_success" ? html`<div class="alert alert-success shadow-sm"><i class="fa-solid fa-check"></i> ${t("admin.sync_success")}</div>` : ""}
                    ${msg === "crawl_success" ? html`<div class="alert alert-success shadow-sm"><i class="fa-solid fa-check"></i> ${t("admin.crawl_success")}</div>` : ""}
                    ${msg === "remove_success" ? html`<div class="alert alert-success shadow-sm"><i class="fa-solid fa-check"></i> ${t("admin.remove_success")}</div>` : ""}

                    <div class="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                        <h1 class="text-3xl font-black italic tracking-tighter text-primary mb-6">ADMIN STATS</h1>
                        
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="stats shadow shadow-primary/10">
                                <div class="stat">
                                    <div class="stat-title text-xs font-bold uppercase">${t("admin.total_users")}</div>
                                    <div class="stat-value text-primary">${usersCount}</div>
                                </div>
                            </div>
                            <div class="stats shadow shadow-primary/10">
                                <div class="stat">
                                    <div class="stat-title text-xs font-bold uppercase">${t("admin.total_sites")}</div>
                                    <div class="stat-value text-secondary">${sitesCount}</div>
                                </div>
                            </div>
                            <div class="stats shadow shadow-primary/10">
                                <div class="stat">
                                    <div class="stat-title text-xs font-bold uppercase">${t("admin.total_rings")}</div>
                                    <div class="stat-value text-accent">${ringsCount}</div>
                                </div>
                            </div>
                            <div class="stats shadow shadow-primary/10">
                                <div class="stat">
                                    <div class="stat-title text-xs font-bold uppercase">${t("admin.total_memberships")}</div>
                                    <div class="stat-value">${membershipsCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                             <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                                 <i class="fa-solid fa-wrench text-primary"></i>
                                 ${t("admin.utilities")}
                             </h2>
                             <div class="space-y-6">
                                 <div class="card bg-base-200 p-4 border border-base-300">
                                     <h3 class="font-bold text-sm mb-1">${t("admin.sync_all")}</h3>
                                     <p class="text-xs opacity-70 mb-4">${t("admin.sync_all_desc")}</p>
                                     <form method="POST" action="/dashboard/admin/sync-all">
                                         <button type="submit" class="btn btn-primary btn-sm w-full">
                                             <i class="fa-solid fa-rotate mr-1"></i>
                                             ${t("admin.sync_all")}
                                         </button>
                                     </form>
                                 </div>

                                 <div class="card bg-base-200 p-4 border border-base-300">
                                     <h3 class="font-bold text-sm mb-1">${t("admin.crawl_rss")}</h3>
                                     <p class="text-xs opacity-70 mb-4">${t("admin.crawl_rss_desc")}</p>
                                     <form method="POST" action="/dashboard/admin/crawl-rss">
                                         <button type="submit" class="btn btn-secondary btn-sm w-full">
                                             <i class="fa-solid fa-rss mr-1"></i>
                                              ${t("admin.crawl_rss")}
                                         </button>
                                     </form>
                                 </div>

                                 <div class="card bg-error/10 p-4 border border-error/20">
                                     <h3 class="font-bold text-sm mb-1 text-error">${t("admin.remove_user")}</h3>
                                     <p class="text-xs opacity-70 mb-4">${t("admin.confirm_remove_user")}</p>
                                     <form method="POST" action="/dashboard/admin/remove-user" onsubmit="return confirm('${t("admin.confirm_remove_user")}')">
                                         <div class="flex gap-2">
                                             <input type="text" name="did" placeholder="${t("admin.remove_user_placeholder")}" aria-label="${t("admin.remove_user_placeholder")}" class="input input-bordered input-sm flex-1 font-mono text-xs" required />
                                             <button type="submit" class="btn btn-error btn-sm">
                                                 ${t("admin.remove_user_btn")}
                                             </button>
                                         </div>
                                     </form>
                                 </div>
                             </div>
                        </div>

                        <div class="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                            <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                                 <i class="fa-solid fa-users text-primary"></i>
                                 ${t("admin.recent_users")}
                            </h2>
                            <div class="overflow-x-auto">
                                <table class="table table-zebra table-sm w-full">
                                    <thead>
                                        <tr>
                                            <th>${t("admin.handle")}</th>
                                            <th>${t("admin.created_at")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(recentUsers.results as any[]).map(
                                            (user) => html`
                                            <tr>
                                                <td class="font-bold">
                                                    <div>${user.handle}</div>
                                                    <div class="text-[10px] opacity-30 font-mono">${user.did}</div>
                                                </td>
                                                <td class="text-xs">${user.created_at ? new Date(user.created_at * 1000).toLocaleString() : "-"}</td>
                                            </tr>
                                        `,
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-start">
                        <a href="/dashboard" class="btn btn-ghost btn-sm">
                            <i class="fa-solid fa-arrow-left mr-2"></i>
                            ${t("common.back_to_dashboard")}
                        </a>
                    </div>
                </div>
            `,
        }),
    );
});

app.post("/sync-all", async (c) => {
    const payload = c.get("jwtPayload");
    if (payload?.role !== "admin") return c.text("Forbidden", 403);

    await AdminService.syncAllUsersData(c.env.DB);
    return c.redirect("/dashboard/admin/stats?msg=sync_success");
});

app.post("/crawl-rss", async (c) => {
    const payload = c.get("jwtPayload");
    if (payload?.role !== "admin") return c.text("Forbidden", 403);

    await updateAllFeeds(c.env.DB, true);
    return c.redirect("/dashboard/admin/stats?msg=crawl_success");
});

app.post("/remove-user", async (c) => {
    const payload = c.get("jwtPayload");
    if (payload?.role !== "admin") return c.text("Forbidden", 403);

    const { did } = await c.req.parseBody();
    if (typeof did === "string" && did.startsWith("did:")) {
        await AdminService.removeUser(c.env.DB, did);
        return c.redirect("/dashboard/admin/stats?msg=remove_success");
    }

    return c.redirect("/dashboard/admin/stats?error=invalid_did");
});

export default app;
