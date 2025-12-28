import { Hono } from 'hono';
import { Bindings } from './types/bindings.js';
import type { ExportedHandler } from '@cloudflare/workers-types';
import home from './routes/home.js';
import antenna from './routes/antenna.js';
import rings from './routes/rings.js';
import dashboard from './routes/dashboard.js';
import auth from './routes/auth.js';
import navigation from './routes/navigation.js';
import widgetBuilder from './routes/widget_builder.js';
import { fetchAndParseFeed } from './services/feed.js';
import db from './db.js';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
    c.env = { DB: db } as any;
    await next();
});

// Mount routes
app.route('/', home);
app.route('/antenna', antenna);
app.route('/rings', rings);
app.route('/dashboard', dashboard);
app.route('/dashboard/ring/widget', widgetBuilder);
app.route('/', auth);
// Note: auth route handles /login (GET), /auth/login (POST), /auth/callback (GET)
// If we mount at /, all paths in auth.ts are relative to /.
// auth.ts has: get('/login'), post('/auth/login'), get('/auth/callback')
// So this matches the original structure.

app.route('/nav', navigation);

// Compatibility redirect for users who use /widget.js
app.get('/widget.js', (c) => c.redirect('/nav/widget.js'));

// Lexicon distribution via serveStatic
import { serveStatic } from '@hono/node-server/serve-static';

app.use('/lexicons/*', serveStatic({ root: './' }));

const scheduled: ExportedHandler<Bindings>['scheduled'] = async (event, env, ctx) => {
    console.log("Running scheduled event: update-feeds");
    try {
        const sites = await env.DB.prepare("SELECT * FROM sites WHERE rss_url IS NOT NULL AND is_active = 1").all();
        if (!sites.results) return;

        for (const site of sites.results as any[]) {
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

export default app;
