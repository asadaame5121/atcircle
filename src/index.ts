import "dotenv/config";
import dns from "node:dns";
import { serve } from "@hono/node-server";
import cron from "node-cron";

dns.setDefaultResultOrder("ipv4first");

import { Hono } from "hono";
import app from "./app.js";
import { DB_PATH, PORT, PUBLIC_URL } from "./config.js";
import db from "./db.js";
import { logger as pinoLogger } from "./lib/logger.js";
import { updateAllFeeds } from "./services/feed.js";

// Create a new Hono instance for the Node.js server
const server = new Hono();

// Inject local DB for Node.js environment
server.use("*", async (c, next) => {
    // @ts-expect-error
    c.env = { ...c.env, DB: db };
    await next();
});

// Mount the main application
server.route("/", app);

pinoLogger.info("[Startup] AT CIRCLE Node Server starting...");
pinoLogger.info(`[Startup] Node Version: ${process.version}`);
pinoLogger.info(`[Startup] Port: ${PORT}`);
pinoLogger.info(`[Startup] Database Path: ${DB_PATH}`);
pinoLogger.info(`[Startup] PUBLIC_URL: ${PUBLIC_URL}`);

// Set up Cron Job
function setupCron() {
    // Run every day at 00:00
    cron.schedule("0 0 * * *", async () => {
        pinoLogger.info("[Cron] Running scheduled feed update...");
        try {
            await updateAllFeeds(db);
        } catch (e) {
            pinoLogger.error({
                msg: "[Cron] Scheduled update failed",
                error: e,
            });
        }
    });
    pinoLogger.info("[Startup] Cron job scheduled (Daily at 00:00)");
}

setupCron();
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain || process.env.NODE_ENV === "production") {
    const serverInstance = serve(
        {
            fetch: server.fetch,
            hostname: "0.0.0.0",
            port: PORT,
        },
        (info) => {
            pinoLogger.info(
                `[Startup] Server is listening on http://${info.address}:${info.port}`,
            );
        },
    );

    const shutdown = (signal: string) => {
        pinoLogger.info(
            `[Shutdown] Received ${signal}. Shutting down gracefully...`,
        );
        serverInstance.close(() => {
            pinoLogger.info("[Shutdown] HTTP server closed.");
            try {
                // @ts-expect-error
                if (db && typeof (db as any).getClient === "function") {
                    // @ts-expect-error
                    (db as any).getClient().close();
                    pinoLogger.info("[Shutdown] Database connection closed.");
                }
            } catch (e) {
                pinoLogger.error({
                    msg: "[Shutdown] Error closing database",
                    error: e,
                });
            }
            process.exit(0);
        });

        // Force close if graceful shutdown takes too long
        setTimeout(() => {
            pinoLogger.error(
                "[Shutdown] Force exiting due to timeout during graceful shutdown",
            );
            process.exit(1);
        }, 9000); // 9 seconds (Fly.io kill_timeout will be 10s)
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

export default server;
