import { Hono } from 'hono';
import { html } from 'hono/html';
import { Layout } from '../components/Layout';
import { Bindings } from '../types/bindings';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
    const sites = await c.env.DB.prepare("SELECT * FROM sites WHERE is_active = 1 ORDER BY created_at DESC").all<any>(); 
    
    return c.html(Layout({
        title: 'Webring Sites',
        children: html`
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <h1 class="card-title text-3xl mb-6">Webring Sites</h1>
                    <p class="mb-4">Welcome to the Webring! Here are the active participants.</p>
                
                 ${sites.results && sites.results.length > 0 ? html`
                    <div class="overflow-x-auto">
                        <table class="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Site</th>
                                    <th>Description</th>
                                    <th>RSS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sites.results.map(site => html`
                                    <tr>
                                        <td>
                                            <a href="${site.url}" target="_blank" class="link link-primary font-bold text-lg">${site.title}</a>
                                        </td>
                                        <td>${site.description || 'No description provided.'}</td>
                                        <td>
                                            ${site.rss_url ? html`<a href="${site.rss_url}" target="_blank" class="badge badge-warning gap-2">RSS</a>` : ''}
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>
                 ` : html`<div class="alert alert-info">No sites found yet.</div>`}

                 <div class="card-actions justify-center mt-8">
                    <a href="/login" class="btn btn-primary">Join the Webring</a>
                    <a href="/" class="btn btn-ghost">Back to Home</a>
                 </div>
                </div>
            </div>
        `
    }));
});

export default app;
