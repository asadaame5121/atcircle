import "dotenv/config";
import dns from "node:dns";
import { serve } from "@hono/node-server";

dns.setDefaultResultOrder("ipv4first");
import app from "./app.js";
import db from "./db.js";
import { DB_PATH, PORT, PUBLIC_URL } from "./config.js";

console.log(`[Startup] Webring Node Server starting...`);
console.log(`[Startup] Node Version: ${process.version}`);
console.log(`[Startup] Port: ${PORT}`);
console.log(`[Startup] Database Path: ${DB_PATH}`);
console.log(`[Startup] PUBLIC_URL: ${PUBLIC_URL}`);

// Initialize Database Schema
async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      did TEXT PRIMARY KEY,
      handle TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_did TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      rss_url TEXT,
      is_active INTEGER DEFAULT 1,
      acceptance_policy TEXT DEFAULT 'manual',
      atproto_status TEXT DEFAULT 'open',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_did) REFERENCES users(did)
    );

    CREATE TABLE IF NOT EXISTS antenna_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      published_at INTEGER,
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    CREATE TABLE IF NOT EXISTS oauth_states (
      key TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sites_user_did ON sites(user_did);
    CREATE INDEX IF NOT EXISTS idx_antenna_items_site_id ON antenna_items(site_id);
    CREATE INDEX IF NOT EXISTS idx_antenna_items_published_at ON antenna_items(published_at DESC);
  `);
  console.log("[Startup] Database initialized successfully");
}

initDb().then(() => {
  serve({
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port: PORT,
  }, (info) => {
    console.log(
      `[Startup] Server is listening on http://${info.address}:${info.port}`,
    );
  });
}).catch((err) => {
  console.error("[Startup] Failed to initialize database:", err);
  process.exit(1);
});
