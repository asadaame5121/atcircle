import { Hono } from 'hono';
import { html } from 'hono/html';
import { Layout } from '../components/Layout';
import { Bindings } from '../types/bindings';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
    try {
        const items = await c.env.DB.prepare(`
            SELECT 
                ai.title as item_title, 
                ai.url as item_url, 
                ai.published_at, 
                s.title as site_title, 
                s.url as site_url 
            FROM antenna_items ai
            JOIN sites s ON ai.site_id = s.id
            WHERE s.is_active = 1
            ORDER BY ai.published_at DESC
            LIMIT 50
        `).all<any>();

        return c.html(Layout({
            title: 'Webring Antenna',
            children: html`
                <div class="card bg-base-100 shadow-xl">
                    <div class="card-body">
                        <h2 class="card-title text-3xl mb-2">Antenna</h2>
                        <p class="mb-6 opacity-70">Recent updates from the community.</p>
                        
                        ${items.results && items.results.length > 0 ? html`
                            <ul class="timeline timeline-vertical timeline-compact">
                                ${items.results.map((item: any) => html`
                                    <li>
                                        <div class="timeline-middle">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-primary"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                                        </div>
                                        <div class="timeline-end mb-10 w-full card bg-base-200 p-4 rounded-box">
                                            <div class="flex items-center gap-2 mb-1">
                                                <a href="${item.site_url}" target="_blank" class="font-bold text-sm link link-hover">${item.site_title}</a>
                                                <span class="text-xs opacity-50">${new Date(item.published_at * 1000).toLocaleString()}</span>
                                            </div>
                                            <div class="text-lg font-semibold">
                                                <a href="${item.item_url}" target="_blank" class="link link-primary no-underline hover:underline">${item.item_title}</a>
                                            </div>
                                        </div>
                                        <hr/>
                                    </li>
                                `)}
                            </ul>
                        ` : html`<div class="alert">No updates yet. Check back later!</div>`}
                    </div>
                </div>
            `
        }));
    } catch (e) {
        console.error(e);
        return c.text('Failed to load antenna', 500);
    }
});

export default app;
