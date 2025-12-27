import { Hono } from 'hono';
import { Bindings } from './types/bindings';
import type { ExportedHandler } from '@cloudflare/workers-types';
import home from './routes/home';
import antenna from './routes/antenna';
import sites from './routes/sites';
import dashboard from './routes/dashboard';
import auth from './routes/auth';
import navigation from './routes/navigation';
import { fetchAndParseFeed } from './services/feed';

const app = new Hono<{ Bindings: Bindings }>();

// Mount routes
app.route('/', home);
app.route('/antenna', antenna);
app.route('/sites', sites);
app.route('/dashboard', dashboard);
app.route('/', auth); // Mounted at root to handle /login, not /auth/login (internal)
// Note: auth route handles /login (GET), /auth/login (POST), /auth/callback (GET)
// If we mount at /, all paths in auth.ts are relative to /.
// auth.ts has: get('/login'), post('/auth/login'), get('/auth/callback')
// So this matches the original structure.

app.route('/nav', navigation);

// Compatibility redirect for users who use /widget.js
app.get('/widget.js', (c) => c.redirect('/nav/widget.js'));

const scheduled: ExportedHandler<Bindings>['scheduled'] = async (event, env, ctx) => {
    console.log("Running scheduled event: update-feeds");
    try {
        const sites = await env.DB.prepare("SELECT * FROM sites WHERE rss_url IS NOT NULL AND is_active = 1").all<any>();
        if (!sites.results) return;

        for (const site of sites.results) {
            console.log(`Fetching feed for ${site.title} (${site.rss_url})`);
            try {
                const feed = await fetchAndParseFeed(site.rss_url);
                
                // Keep only the last 5 items to avoid spamming the DB for now
                const recentItems = feed.items.slice(0, 5);

                for (const item of recentItems) {
                    if (!item.link || !item.title) continue;

                    // Check for duplicates
                    const exists = await env.DB.prepare("SELECT 1 FROM antenna_items WHERE url = ?").bind(item.link).first();
                    
                    if (!exists) {
                        const publishedAt = item.isoDate ? new Date(item.isoDate).getTime() / 1000 : Math.floor(Date.now() / 1000);
                        
                        await env.DB.prepare(
                            "INSERT INTO antenna_items (site_id, title, url, published_at) VALUES (?, ?, ?, ?)"
                        ).bind(site.id, item.title, item.link, publishedAt).run();
                        console.log(`Added: ${item.title}`);
                    }
                }
            } catch (e) {
                console.error(`Error processing feed for site ${site.id}:`, e);
            }
        }
    } catch (e) {
        console.error("Scheduled task failed:", e);
    }
};

export default {
    fetch: app.fetch,
    scheduled
};
