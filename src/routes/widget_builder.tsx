import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { WidgetBuilder } from "../components/dashboard/WidgetBuilder.js";
import { Layout } from "../components/Layout.js";
import { authMiddleware } from "../middleware/auth.js";
import { RingService } from "../services/ring.service.js";
import { WidgetService } from "../services/widget.service.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Protected Route Middleware
// Protected Route Middleware
app.use("*", authMiddleware);

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

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB (PDS Limit)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

app.post("/upload-banner", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const banner = body.banner as File;
    const ringUri = body.ring_uri as string;
    const memberUri = body.member_uri as string | undefined;

    if (!banner || !ringUri) {
        return c.json(
            { success: false, error: "Missing banner or ring_uri" },
            400,
        );
    }

    // Security: Validate file size and type
    if (banner.size > MAX_FILE_SIZE) {
        return c.json(
            { success: false, error: "File too large (Max 1MB)" },
            400,
        );
    }
    if (!ALLOWED_MIME_TYPES.includes(banner.type)) {
        return c.json({ success: false, error: "Invalid file type" }, 400);
    }

    const ringService = new RingService(c.env.DB);
    const result = await ringService.uploadBanner(
        did,
        ringUri,
        banner,
        memberUri,
    );

    if (result.success) {
        return c.json(result);
    } else {
        return c.json(result, result.error === "Unauthorized" ? 403 : 500);
    }
});

const saveSettingsSchema = z.object({
    ring_uri: z.string(),
    banner_url: z
        .string()
        .url()
        .regex(/^https?:\/\//)
        .optional()
        .or(z.literal("")),
    member_uri: z.string().optional(),
});

app.post(
    "/save-settings",
    zValidator("json", saveSettingsSchema),
    async (c) => {
        const payload = c.get("jwtPayload");
        const did = payload.sub;
        const { ring_uri, banner_url, member_uri } = c.req.valid("json");

        const ringService = new RingService(c.env.DB);
        const result = await ringService.saveWidgetSettings(
            did,
            ring_uri,
            banner_url || null, // Convert empty string or undefined to null for DB
            member_uri,
        );

        if (result.success) {
            return c.json(result);
        } else {
            return c.json(result, result.error === "Unauthorized" ? 403 : 500);
        }
    },
);

export default app;
