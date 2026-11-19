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
            current: "dashboard",
            children: html`
                <h1 class="rt-h1">■ ADMIN STATS ■</h1>
                ${
                    msg === "sync_success" ||
                    msg === "crawl_success" ||
                    msg === "remove_success"
                        ? html`<p class="rt-flash" role="status">★ ${t(`admin.${msg}`)} ★</p>`
                        : ""
                }
                <dl class="rt-stats">
                    <div><dt>${t("admin.total_users")}</dt><dd>${usersCount}</dd></div>
                    <div><dt>${t("admin.total_sites")}</dt><dd>${sitesCount}</dd></div>
                    <div><dt>${t("admin.total_rings")}</dt><dd>${ringsCount}</dd></div>
                    <div><dt>${t("admin.total_memberships")}</dt><dd>${membershipsCount}</dd></div>
                </dl>

                <section class="rt-box rt-section" aria-labelledby="admin-utils">
                    <h2 id="admin-utils" class="rt-box-title">${t("admin.utilities")}</h2>
                    <div class="rt-advanced-body rt-more">
                        <form method="POST" action="/dashboard/admin/sync-all">
                            <p class="rt-note">${t("admin.sync_all_desc")}</p>
                            <button type="submit" class="rt-bevel rt-block">${t("admin.sync_all")}</button>
                        </form>
                        <form method="POST" action="/dashboard/admin/crawl-rss">
                            <p class="rt-note">${t("admin.crawl_rss_desc")}</p>
                            <button type="submit" class="rt-bevel rt-block">${t("admin.crawl_rss")}</button>
                        </form>
                        <form method="POST" action="/dashboard/admin/remove-user" data-confirm="${t("admin.confirm_remove_user")}">
                            <label class="rt-label" for="remove-did">${t("admin.remove_user")}</label>
                            <input id="remove-did" type="text" name="did" placeholder="${t("admin.remove_user_placeholder")}" class="rt-sunken rt-input rt-mono" required />
                            <button type="submit" class="rt-bevel rt-block rt-danger">${t("admin.remove_user_btn")}</button>
                        </form>
                    </div>
                </section>

                <section class="rt-box" aria-labelledby="admin-users">
                    <h2 id="admin-users" class="rt-box-title">${t("admin.recent_users")}</h2>
                    <div class="rt-table-wrap">
                        <table class="rt-table">
                            <thead>
                                <tr><th>${t("admin.handle")}</th><th>${t("admin.created_at")}</th></tr>
                            </thead>
                            <tbody>
                                ${(recentUsers.results as any[]).map(
                                    (user) => html`
                                    <tr>
                                        <td><b>${user.handle}</b><br><span class="rt-did">${user.did}</span></td>
                                        <td>${user.created_at ? new Date(user.created_at * 1000).toLocaleString() : "-"}</td>
                                    </tr>
                                `,
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
                <p class="rt-right"><a href="/dashboard">${t("common.back_to_dashboard")}</a></p>
                <script>
                    document.addEventListener("submit", function (e) {
                        var f = e.target;
                        if (f && f.dataset && f.dataset.confirm && !confirm(f.dataset.confirm)) e.preventDefault();
                    });
                </script>
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
