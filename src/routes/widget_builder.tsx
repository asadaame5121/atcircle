import { Hono } from 'hono';
import { html } from 'hono/html';
import { Layout } from '../components/Layout.js';
import { Bindings } from '../types/bindings.js';
import { AtUri } from '@atproto/api';
import { AtProtoService } from '../services/atproto.js';
import { restoreAgent } from '../services/oauth.js';
import { SECRET_KEY, PUBLIC_URL } from '../config.js';

const app = new Hono<{ Bindings: Bindings, Variables: { jwtPayload: any } }>();

app.get('/', async (c) => {
    const ringUri = c.req.query('ring_uri');
    const payload = c.get('jwtPayload');
    const did = payload.sub;

    if (!ringUri) return c.redirect('/dashboard');

    // Fetch site data for this user
    const site = await c.env.DB.prepare("SELECT * FROM sites WHERE user_did = ?").bind(did).first() as any;
    if (!site) return c.redirect('/dashboard');

    // Fetch ring title if possible (from local DB)
    let ring = await c.env.DB.prepare("SELECT title FROM rings WHERE uri = ?").bind(ringUri).first() as { title: string } | null;
    let ringTitle = ring?.title;

    if (!ringTitle) {
        // Try fetching from ATProto and cache it
        console.log(`[WidgetBuilder] Ring title not in DB for ${ringUri}, fetching from ATProto...`);
        try {
            const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
            if (agent) {
                const ringData = await AtProtoService.getRing(agent, ringUri);
                ringTitle = ringData.value.title;
                // Cache it
                await c.env.DB.prepare(
                    "INSERT OR IGNORE INTO rings (uri, owner_did, title, description) VALUES (?, ?, ?, ?)"
                ).bind(ringUri, new AtUri(ringUri).hostname, ringTitle, ringData.value.description || null).run();
            }
        } catch (e) {
            console.error("Failed to fetch ring title from ATProto:", e);
        }
    }

    if (!ringTitle) ringTitle = 'Webring';

    const baseUrl = PUBLIC_URL;

    return c.html(Layout({
        title: `Widget for ${ringTitle}`,
        children: html`
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body">
                    <div class="flex items-center gap-4 mb-6">
                        <a href="/dashboard" class="btn btn-ghost btn-sm">← Back</a>
                        <h1 class="card-title text-2xl">Widget for ${ringTitle}</h1>
                    </div>

                    <div class="alert alert-info mb-8 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>This widget will only navigate between members of <strong>${ringTitle}</strong>.</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">Theme</span></label>
                            <select id="w-theme" class="select select-bordered w-full" onchange="updatePreview()">
                                <option value="system">System (Auto)</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>

                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">Layout</span></label>
                            <select id="w-layout" class="select select-bordered w-full" onchange="updatePreview()">
                                <option value="default">Default (Banner)</option>
                                <option value="compact">Compact (Grid)</option>
                            </select>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" id="w-transparent" class="checkbox checkbox-primary" onchange="updatePreview()">
                                <span class="label-text font-bold">Transparent Background</span>
                            </label>
                        </div>
                    </div>

                    <div class="divider">Preview</div>
                    <div class="bg-base-200 p-8 rounded-lg flex justify-center mb-8" id="preview-area">
                        <!-- Widget will be injected here -->
                    </div>

                    <div class="divider">Embed Code</div>
                    <div class="mockup-code bg-neutral text-neutral-content relative group">
                        <pre class="whitespace-pre-wrap px-4"><code id="w-code"></code></pre>
                        <button class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onclick="copyCode()" title="Copy to clipboard">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <script src="/nav/widget.js"></script>
            <script>
                const ringUri = "${ringUri}";
                const siteUrl = "${site.url}";
                const baseUrl = "${baseUrl}";

                function updatePreview() {
                    const theme = document.getElementById('w-theme').value;
                    const layout = document.getElementById('w-layout').value;
                    const transparent = document.getElementById('w-transparent').checked;

                    // Update UI Preview
                    const previewArea = document.getElementById('preview-area');
                    previewArea.innerHTML = '';
                    const nav = document.createElement('webring-nav');
                    nav.setAttribute('site', siteUrl);
                    nav.setAttribute('ring', ringUri);
                    if (theme !== 'system') nav.setAttribute('theme', theme);
                    if (layout !== 'default') nav.setAttribute('layout', layout);
                    if (transparent) nav.setAttribute('transparent', '');
                    previewArea.appendChild(nav);

                    // Update Code
                    let tag = '<webring-nav site="' + siteUrl + '" ring="' + ringUri + '"';
                    if (theme !== 'system') tag += ' theme="' + theme + '"';
                    if (layout !== 'default') tag += ' layout="' + layout + '"';
                    if (transparent) tag += ' transparent';
                    tag += '></webring-nav>';

                    const scriptTag = '<script src="' + baseUrl + '/nav/widget.js"><' + '/script>';
                    document.getElementById('w-code').textContent = scriptTag + '\\n' + tag;
                }

                function copyCode() {
                    const code = document.getElementById('w-code').textContent;
                    navigator.clipboard.writeText(code).then(() => {
                        alert('Copied to clipboard!');
                    });
                }

                window.addEventListener('load', updatePreview);
            </script>
        `
    }));
});

export default app;
