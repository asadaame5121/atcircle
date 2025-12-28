import { Hono } from 'hono';
import { Bindings } from './types/bindings.js';
import home from './routes/home.js';
import antenna from './routes/antenna.js';
import rings from './routes/rings.js';
import dashboard from './routes/dashboard.js';
import auth from './routes/auth.js';
import navigation from './routes/navigation.js';
import widgetBuilder from './routes/widget_builder.js';
import { updateAllFeeds } from './services/feed.js';
import db from './db.js';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
    c.env = { DB: db } as any;
    await next();
});

// Manual feed sync trigger (Admin/Dashboard)
app.post('/dashboard/sync/feeds', async (c) => {
    try {
        const result = await updateAllFeeds(c.env.DB);
        return c.json(result);
    } catch (e) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

// Mount routes
app.route('/', home);
app.route('/antenna', antenna);
app.route('/rings', rings);
app.route('/dashboard', dashboard);
app.route('/dashboard/ring/widget', widgetBuilder);
app.route('/', auth);
app.route('/nav', navigation);

// Compatibility redirect for users who use /widget.js
app.get('/widget.js', (c) => c.redirect('/nav/widget.js'));

// Lexicon distribution (XRPC-style resolution with CORS)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cors } from 'hono/cors';

app.use('/xrpc/*', cors());
app.get('/xrpc/:id', async (c) => {
    const id = c.req.param('id');
    const filename = id.endsWith('.json') ? id : `${id}.json`;
    try {
        const path = join(process.cwd(), 'lexicons', filename);
        const content = readFileSync(path, 'utf8');
        return c.json(JSON.parse(content));
    } catch (e) {
        return c.text('Not found', 404);
    }
});

export default app;
