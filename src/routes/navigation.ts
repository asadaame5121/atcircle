import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateWidgetScript } from "../components/NavigationWidget.js";
import { PUBLIC_URL } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { NavigationService } from "../services/navigation.service.js";
import { markWidgetSeen } from "../services/widget-presence.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// CORSを全オリジンに許可（ウィジェットは外部サイトから読み込まれるため）
app.use(
    "/widget.js",
    cors({
        origin: "*",
        allowMethods: ["GET"],
    }),
);

app.use(
    "/ping",
    cors({
        origin: "*",
        allowMethods: ["GET"],
    }),
);

/** ウィジェットの表示・クリックを設置の目安として記録する。失敗しても利用者の操作は止めない */
const recordSeen = async (db: D1Database, ring?: string, url?: string) => {
    if (!ring || !url) return;
    try {
        await markWidgetSeen(db, ring, url);
    } catch (e) {
        pinoLogger.warn({ msg: "[WidgetSeen] record failed", error: e });
    }
};

// ウィジェット（widget.js）が表示されたことの通知。画像リクエストで呼ばれる
app.get("/ping", async (c) => {
    await recordSeen(c.env.DB, c.req.query("ring"), c.req.query("site"));
    return c.body(null, 204, {
        "Cache-Control": "no-store",
        "Cross-Origin-Resource-Policy": "cross-origin",
    });
});

// Random Jump
app.get("/random", async (c) => {
    const ringUri = c.req.query("ring");
    const navService = new NavigationService(c.env.DB);
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

    await recordSeen(c.env.DB, ringUri, fromUrl);
    const navService = new NavigationService(c.env.DB);
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

    await recordSeen(c.env.DB, ringUri, fromUrl);
    const navService = new NavigationService(c.env.DB);
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
        "Cross-Origin-Resource-Policy": "cross-origin", // Allow embedding from any origin
    });
});

export default app;
