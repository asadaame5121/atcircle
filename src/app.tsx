import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { IS_DEV, ZAP_SCAN_KEY } from "./config.js";
import { logger as pinoLogger } from "./lib/logger.js";
import { i18nMiddleware } from "./middleware/i18n.js";
import antenna from "./routes/antenna.js";
import api from "./routes/api.js";
import auth from "./routes/auth.js";
import dashboard from "./routes/dashboard.js";
import home from "./routes/home.js";
import legal from "./routes/legal.js";
import navigation from "./routes/navigation.js";
import r from "./routes/r.js";
import rings from "./routes/rings.js";
import u from "./routes/u.js";
import { updateAllFeeds } from "./services/feed.js";
import type { Bindings } from "./types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: any }>();

// Serve static assets
app.use("/assets/*", serveStatic({ root: "./" }));

// Pino Logging Middleware
app.use("*", async (c, next) => {
    const { method, path } = c.req;
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    pinoLogger.info({
        method,
        path,
        status: c.res.status,
        duration: `${ms}ms`,
    });
});

// Security Headers
app.use(
    "*",
    secureHeaders({
        contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "https://scripts.simpleanalyticscdn.com",
                "https://cdnjs.buymeacoffee.com",
                "'unsafe-inline'", // Needed for some widgets/inline scripts if hashes aren't used
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Needed for 'style' blocks in Layout.tsx and many UI libraries
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com", // Google Fonts
            ],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.gstatic.com", // Google Fonts
            ],
            imgSrc: ["'self'", "data:", "https:"], // Allow all https images for user content/avatars
            connectSrc: [
                "'self'",
                "https://queue.simpleanalyticscdn.com",
                "https://scripts.simpleanalyticscdn.com", // Maps
                "https://cdn.jsdelivr.net", // Maps
            ], // Simple Analytics events
        },
        strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
        xFrameOptions: "DENY",
        xXssProtection: "1; mode=block",
        referrerPolicy: "strict-origin-when-cross-origin",
    }),
);

// CSRF Protection
app.use(
    "*",
    csrf({
        origin: (origin, c) => {
            // ZAP Bypass
            const zapKey = c.req.header("X-Zap-Scan");
            if (zapKey && zapKey === ZAP_SCAN_KEY) {
                return true;
            }

            // Dev Environment: Allow localhost variants
            if (IS_DEV) {
                return (
                    !origin || // Handle non-browser tools like curl
                    /localhost|127\.0\.0\.1|\[::1\]/.test(origin)
                );
            }

            // Production: Strict check against PUBLIC_URL or same origin
            // (Hono's default behavior is same-origin, but we verify explicitly if needed)
            return origin === new URL(c.req.url).origin;
        },
    }),
);

app.use("*", i18nMiddleware());
// DB injection moved to entry points (index.ts / worker.ts)

// Compatibility for old widget builder path

// Compatibility for old widget builder path
app.all("/widget-builder/:path+", (c) => {
    const path = c.req.param("path");
    const newPath = `/dashboard/ring/widget/${path}`;
    pinoLogger.info({
        msg: "Redirecting legacy widget builder path",
        from: c.req.path,
        to: newPath,
    });
    return c.redirect(newPath, 307);
});

// Custom 404 handler for debugging
app.notFound((c) => {
    pinoLogger.warn({
        msg: "404 Not Found",
        method: c.req.method,
        path: c.req.path,
    });
    return c.text(`404 Not Found (Debug: ${c.req.path})`, 404);
});

// Manual feed sync trigger (Admin/Dashboard)
app.post("/dashboard/sync/feeds", async (c) => {
    try {
        const result = await updateAllFeeds(c.env.DB);
        return c.json(result);
    } catch (e) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

// Mount routes
app.route("/api", api);
app.route("/", home);
app.route("/antenna", antenna);
app.route("/rings", rings);
app.route("/dashboard", dashboard);
app.route("/r", r);
app.route("/u", u);
app.route("/", auth);
app.route("/", legal);
app.route("/nav", navigation);

// Compatibility redirect for users who use /widget.js
app.get("/widget.js", (c) => c.redirect("/nav/widget.js"));

// Short Aliases for SNS/No-JS
app.get("/n", (c) =>
    c.redirect(`/nav/next?${c.req.raw.url.split("?")[1] || ""}`),
);
app.get("/p", (c) =>
    c.redirect(`/nav/prev?${c.req.raw.url.split("?")[1] || ""}`),
);
app.get("/r", (c) =>
    c.redirect(`/nav/random?${c.req.raw.url.split("?")[1] || ""}`),
);

// Lexicon distribution (XRPC-style resolution with CORS)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cors } from "hono/cors";

app.use("/xrpc/*", cors());
app.get("/xrpc/:id", async (c) => {
    const id = c.req.param("id");
    const filename = id.endsWith(".json") ? id : `${id}.json`;
    try {
        const path = join(process.cwd(), "lexicons", filename);
        const content = readFileSync(path, "utf8");
        return c.json(JSON.parse(content));
    } catch (_e) {
        return c.text("Not found", 404);
    }
});

export default app;
