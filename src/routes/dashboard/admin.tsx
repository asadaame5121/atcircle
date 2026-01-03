import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../../components/Layout.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

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

    return c.html(
        Layout({
            title: t("admin.stats_title"),
            t,
            lang,
            children: html`
                <div class="space-y-8">
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

                    <div class="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
                        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                             <i class="fa-solid fa-users text-primary"></i>
                             ${t("admin.recent_users")}
                        </h2>
                        <div class="overflow-x-auto">
                            <table class="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>${t("admin.handle")}</th>
                                        <th>${t("admin.did")}</th>
                                        <th>${t("admin.created_at")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(recentUsers.results as any[]).map(
                                        (user) => html`
                                        <tr>
                                            <td class="font-bold">${user.handle}</td>
                                            <td class="text-xs opacity-50 font-mono">${user.did}</td>
                                            <td class="text-xs">${user.created_at ? new Date(user.created_at * 1000).toLocaleString() : "-"}</td>
                                        </tr>
                                    `,
                                    )}
                                </tbody>
                            </table>
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

export default app;
