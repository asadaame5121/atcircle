/**
 * Webring Short URL Proxy
 * Handles redirects from /r/[slug] to the actual webring view page.
 */
import { Hono } from "hono";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const db = c.env.DB;

    const ring = await db
        .prepare("SELECT uri FROM rings WHERE slug = ?")
        .bind(slug)
        .first<{ uri: string }>();

    if (ring) {
        // Redirect to the existing ring view with the URI
        // Or we could call the handler directly, but redirect is cleaner for now
        return c.redirect(`/rings/view?ring=${encodeURIComponent(ring.uri)}`);
    }

    return c.notFound();
});

export default app;
