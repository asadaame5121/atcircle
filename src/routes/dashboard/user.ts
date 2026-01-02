import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { logger as pinoLogger } from "../../lib/logger.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/leave (Delete Account)
app.post("/leave", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    try {
        // 1. Delete from local DB (Cascade should handle memberships etc. ideally, but let's be safe)
        // Note: In schema.sql, we don't have ON DELETE CASCADE for all.
        const site = (await c.env.DB.prepare(
            "SELECT id FROM sites WHERE user_did = ?",
        )
            .bind(did)
            .first()) as { id: number };
        if (site) {
            await c.env.DB.prepare("DELETE FROM memberships WHERE site_id = ?")
                .bind(site.id)
                .run();
            await c.env.DB.prepare(
                "DELETE FROM antenna_items WHERE site_id = ?",
            )
                .bind(site.id)
                .run();
            await c.env.DB.prepare("DELETE FROM sites WHERE id = ?")
                .bind(site.id)
                .run();
        }
        await c.env.DB.prepare("DELETE FROM rings WHERE owner_did = ?")
            .bind(did)
            .run();
        await c.env.DB.prepare("DELETE FROM join_requests WHERE user_did = ?")
            .bind(did)
            .run();
        await c.env.DB.prepare("DELETE FROM users WHERE did = ?")
            .bind(did)
            .run();

        // 2. Clear Session
        deleteCookie(c, "session", {
            path: "/",
            secure: true,
            httpOnly: true,
        });

        return c.redirect("/?msg=account_deleted");
    } catch (e) {
        pinoLogger.error({ msg: "Error leaving service", error: e });
        return c.text("Failed to delete account", 500);
    }
});

export default app;
