import "dotenv/config";
import dns from "node:dns";
import { serve } from "@hono/node-server";
import cron from "node-cron";

dns.setDefaultResultOrder("ipv4first");
import app from "./app.js";
import db from "./db.js";
import { DB_PATH, PORT, PUBLIC_URL } from "./config.js";
import { updateAllFeeds } from "./services/feed.js";

console.log(`[Startup] Webring Node Server starting...`);
console.log(`[Startup] Node Version: ${process.version}`);
console.log(`[Startup] Port: ${PORT}`);
console.log(`[Startup] Database Path: ${DB_PATH}`);
console.log(`[Startup] PUBLIC_URL: ${PUBLIC_URL}`);

// Set up Cron Job
function setupCron() {
  // Run every day at 00:00
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Running scheduled feed update...");
    try {
      await updateAllFeeds(db as any);
    } catch (e) {
      console.error("[Cron] Scheduled update failed:", e);
    }
  });
  console.log("[Startup] Cron job scheduled (Daily at 00:00)");
}

setupCron();
serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: PORT,
}, (info) => {
  console.log(
    `[Startup] Server is listening on http://${info.address}:${info.port}`,
  );
});
