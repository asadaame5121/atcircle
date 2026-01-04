import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { WidgetBuilder } from "../components/dashboard/WidgetBuilder.js";
import { Layout } from "../components/Layout.js";
import { SECRET_KEY } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { RingService } from "../services/ring.service.js";
import { WidgetService } from "../services/widget.service.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Protected Route Middleware
app.use("*", async (c, next) => {
    const token = getCookie(c, "session");
    if (!token) {
        return c.redirect(`/login?next=${encodeURIComponent(c.req.url)}`);
    }
    try {
        const payload = await verify(token, SECRET_KEY);
        c.set("jwtPayload", payload);
        await next();
    } catch (e) {
        pinoLogger.error({
            msg: "[WidgetBuilder Route] JWT Verification failed",
            error: e,
        });
        return c.redirect("/login");
    }
});

app.get("/", async (c) => {
    const ringUri = c.req.query("ring_uri");
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const t = c.get("t");
    const lang = c.get("lang");

    if (!ringUri) return c.redirect("/dashboard");

    const widgetService = new WidgetService(c.env.DB);
    const data = await widgetService.getWidgetBuilderData(did, ringUri);

    if ("error" in data) {
        return c.redirect("/dashboard");
    }

    return c.html(
        Layout({
            title: t("widget_builder.title", { ring: data.ringTitle }),
            t,
            lang,
            children: WidgetBuilder({
                ringUri,
                siteUrl: data.site.url,
                baseUrl: data.baseUrl,
                ringTitle: data.ringTitle,
                bannerUrl: data.bannerUrl,
                t,
                lang,
            }),
        }),
    );
});

app.post("/upload-banner", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const banner = body.banner as Blob;
    const ringUri = body.ring_uri as string;

    if (!banner || !ringUri) {
        return c.json(
            { success: false, error: "Missing banner or ring_uri" },
            400,
        );
    }

    const ringService = new RingService(c.env.DB);
    const result = await ringService.uploadBanner(did, ringUri, banner);

    if (result.success) {
        return c.json(result);
    } else {
        return c.json(result, result.error === "Unauthorized" ? 403 : 500);
    }
});

app.post("/save-settings", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { ring_uri, banner_url } = await c.req.json();

    if (!ring_uri) {
        return c.json({ success: false, error: "Missing ring_uri" }, 400);
    }

    const ringService = new RingService(c.env.DB);
    const result = await ringService.saveWidgetSettings(
        did,
        ring_uri,
        banner_url,
    );

    if (result.success) {
        return c.json(result);
    } else {
        return c.json(result, result.error === "Unauthorized" ? 403 : 500);
    }
});

export default app;
