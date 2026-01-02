import "dotenv/config";
import dns from "node:dns";
import { serve } from "@hono/node-server";
import cron from "node-cron";

dns.setDefaultResultOrder("ipv4first");

import app from "./app.js";
import { DB_PATH, PORT, PUBLIC_URL } from "./config.js";
import db from "./db.js";
import { logger as pinoLogger } from "./lib/logger.js";
import { updateAllFeeds } from "./services/feed.js";

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
            await updateAllFeeds(db as any);
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
    serve(
        {
            fetch: app.fetch,
            hostname: "0.0.0.0",
            port: PORT,
        },
        (info) => {
            pinoLogger.info(
                `[Startup] Server is listening on http://${info.address}:${info.port}`,
            );
        },
    );
}

export default app;
