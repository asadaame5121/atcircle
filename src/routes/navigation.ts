import { Hono } from "hono";
import { generateWidgetScript } from "../components/NavigationWidget.js";
import { PUBLIC_URL } from "../config.js";
import { NavigationService } from "../services/navigation.service.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Random Jump
app.get("/random", async (c) => {
    const ringUri = c.req.query("ring");
    const navService = new NavigationService(c.env.DB as any);
    const targetUrl = await navService.getRandomSite(ringUri);

    if (targetUrl) {
        return c.redirect(targetUrl);
    }
    return c.redirect("/");
});

// Next Site in Ring
app.get("/next", async (c) => {
    const ringUri = c.req.query("ring");
    const fromUrl = c.req.query("from");

    if (!ringUri) return c.redirect("/");

    const navService = new NavigationService(c.env.DB as any);
    const targetUrl = await navService.getNextSite(ringUri, fromUrl || "");

    if (targetUrl) {
        return c.redirect(targetUrl);
    }
    return c.redirect("/");
});

// Previous Site in Ring
app.get("/prev", async (c) => {
    const ringUri = c.req.query("ring");
    const fromUrl = c.req.query("from");

    if (!ringUri) return c.redirect("/");

    const navService = new NavigationService(c.env.DB as any);
    const targetUrl = await navService.getPrevSite(ringUri, fromUrl || "");

    if (targetUrl) {
        return c.redirect(targetUrl);
    }
    return c.redirect("/");
});

// Widget JS for Webrings
app.get("/widget.js", async (c) => {
    const script = generateWidgetScript(PUBLIC_URL);
    return c.text(script, 200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
    });
});

export default app;
