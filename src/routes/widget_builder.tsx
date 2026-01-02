import { AtUri } from "@atproto/api";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { html, raw } from "hono/html";
import { verify } from "hono/jwt";
import { Layout } from "../components/Layout.js";
import { PUBLIC_URL, SECRET_KEY } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { AtProtoService } from "../services/atproto.js";
import { restoreAgent } from "../services/oauth.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Protected Route Middleware (Redundant but safe)
app.use("*", async (c, next) => {
    const token = getCookie(c, "session");
    if (!token) {
        pinoLogger.debug({
            msg: "[WidgetBuilder] No session cookie found, redirecting",
            url: c.req.url,
        });
        return c.redirect(`/login?next=${encodeURIComponent(c.req.url)}`);
    }
    try {
        const payload = await verify(token, SECRET_KEY);
        c.set("jwtPayload", payload);
        await next();
    } catch (e) {
        pinoLogger.error({
            msg: "[WidgetBuilder] JWT Verification failed",
            error: e,
        });
        return c.redirect("/login");
    }
});

app.get("/", async (c) => {
    const ringUri = c.req.query("ring_uri");
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const t = c.get("t");
    const lang = c.get("lang");

    if (!ringUri) return c.redirect("/dashboard");

    // Fetch site data for this user
    const site = (await c.env.DB.prepare(
        "SELECT * FROM sites WHERE user_did = ?",
    )
        .bind(did)
        .first()) as any;
    if (!site) return c.redirect("/dashboard");

    // Fetch ring data from local DB
    const ring = (await c.env.DB.prepare(
        "SELECT title, banner_url FROM rings WHERE uri = ?",
    )
        .bind(ringUri)
        .first()) as { title: string; banner_url?: string } | null;
    let ringTitle = ring?.title;
    const bannerUrl = ring?.banner_url || "";

    if (!ringTitle) {
        // Try fetching from ATProto and cache it
        pinoLogger.info({
            msg: "[WidgetBuilder] Ring title not in DB, fetching from ATProto",
            ringUri,
        });
        try {
            const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
            if (agent) {
                const ringData = await AtProtoService.getRing(agent, ringUri);
                ringTitle = ringData.value.title;
                // Cache it
                await c.env.DB.prepare(
                    "INSERT OR IGNORE INTO rings (uri, owner_did, title, description) VALUES (?, ?, ?, ?)",
                )
                    .bind(
                        ringUri,
                        new AtUri(ringUri).hostname,
                        ringTitle,
                        ringData.value.description || null,
                    )
                    .run();
            }
        } catch (e) {
            pinoLogger.error({
                msg: "Failed to fetch ring title from ATProto",
                error: e,
            });
        }
    }

    if (!ringTitle) ringTitle = "Webring";

    const baseUrl = PUBLIC_URL;

    return c.html(
        Layout({
            title: t("widget_builder.title", { ring: ringTitle }),
            t,
            lang,
            children: html`
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body">
                    <div class="flex items-center gap-4 mb-6">
                        <a href="/dashboard" class="btn btn-ghost btn-sm">← ${t("common.back")}</a>
                        <h1 class="card-title text-2xl">${t("widget_builder.title", { ring: ringTitle })}</h1>
                    </div>

                    <div class="alert alert-info mb-8 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>${raw(t("widget_builder.info_alert", { ring: ringTitle }))}</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">${t("widget_builder.field_theme")}</span></label>
                            <select id="w-theme" class="select select-bordered w-full" onchange="updatePreview()">
                                <option value="system">${t("widget_builder.theme_system")}</option>
                                <option value="light">${t("widget_builder.theme_light")}</option>
                                <option value="dark">${t("widget_builder.theme_dark")}</option>
                            </select>
                        </div>

                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">${t("widget_builder.field_layout")}</span></label>
                            <select id="w-layout" class="select select-bordered w-full" onchange="updatePreview()">
                                <option value="html" selected>${t("widget_builder.layout_html")}</option>
                                <option value="default">${t("widget_builder.layout_default")}</option>
                                <option value="compact">${t("widget_builder.layout_compact")}</option>
                                <option value="simple">${t("widget_builder.layout_simple")}</option>
                            </select>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" id="w-transparent" class="checkbox checkbox-primary" onchange="updatePreview()">
                                <span class="label-text font-bold">${t("widget_builder.field_transparent")}</span>
                            </label>
                        </div>
                    </div>

                    <div class="divider">${t("widget_builder.banner_section")}</div>
                    <div class="flex flex-col gap-4 mb-8">
                        <div class="flex items-center gap-4">
                            <img id="banner-preview-img" src="${bannerUrl}" class="w-24 h-24 object-contain bg-base-300 rounded overflow-hidden ${bannerUrl ? "" : "hidden"}" />
                            <div class="flex-1">
                                <input type="file" id="banner-upload" class="file-input file-input-bordered w-full" accept="image/*" />
                                <p class="text-xs mt-1 text-base-content/60">${t("widget_builder.banner_upload_desc")}</p>
                            </div>
                            <button onclick="uploadBanner()" id="btn-upload" class="btn btn-primary">${t("common.upload")}</button>
                        </div>
                    </div>

                    <div class="divider">${t("widget_builder.labels_style_section")}</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">${t("widget_builder.label_title")}</span></label>
                            <input type="text" id="w-label-title" class="input input-bordered w-full" value="${ringTitle}" oninput="updatePreview()" />
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">${t("widget_builder.label_random")}</span></label>
                            <input type="text" id="w-label-random" class="input input-bordered w-full" value="Random" oninput="updatePreview()" />
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">${t("widget_builder.label_list")}</span></label>
                            <input type="text" id="w-label-list" class="input input-bordered w-full" value="List" oninput="updatePreview()" />
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text font-bold">${t("widget_builder.label_css")}</span></label>
                            <input type="text" id="w-css" class="input input-bordered w-full" placeholder="https://example.com/widget.css" oninput="updatePreview()" />
                        </div>
                    </div>

                    <div class="divider">${t("widget_builder.preview")}</div>
                    <div class="bg-base-200 p-8 rounded-lg flex justify-center mb-8" id="preview-area">
                        <!-- Widget will be injected here -->
                    </div>

                    <div class="divider">${t("widget_builder.embed_code")}</div>
                    <div class="mockup-code bg-neutral text-neutral-content relative group">
                        <pre class="whitespace-pre-wrap px-4"><code id="w-code"></code></pre>
                        <button class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onclick="copyCode()" title="${t("common.copy_to_clipboard")}">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        </button>
                    </div>
                </div>
            </div>
            <script src="/nav/widget.js"></script>
            <script>
                console.log("Webring Widget Builder Script Loaded (v3 - cache-buster)");
                const ringUri = "${ringUri}";
                const siteUrl = "${site.url}";
                const baseUrl = "${baseUrl}";
                let currentBannerUrl = "${bannerUrl}";

                function updatePreview() {
                    const theme = document.getElementById('w-theme').value;
                    const layout = document.getElementById('w-layout').value;
                    const transparent = document.getElementById('w-transparent').checked;
                    const labelTitle = document.getElementById('w-label-title').value;
                    const labelRandom = document.getElementById('w-label-random').value;
                    const labelList = document.getElementById('w-label-list').value;
                    const customCss = document.getElementById('w-css').value;

                    // Update UI Preview
                    const previewArea = document.getElementById('preview-area');
                    previewArea.innerHTML = '';
                    
                    if (layout === 'html') {
                        // Plain HTML Preview
                        const div = document.createElement('div');
                        div.style.cssText = 'border: 1px solid #ccc; padding: 15px; border-radius: 8px; text-align: center; background: white; color: black;';
                        const title = document.createElement('strong');
                        title.textContent = labelTitle;
                        div.appendChild(title);
                        div.appendChild(document.createElement('hr'));
                        
                        const links = document.createElement('div');
                        links.style.display = 'flex';
                        links.style.gap = '10px';
                        links.style.justifyContent = 'center';
                        
                        const p = document.createElement('a');
                        p.href = baseUrl + '/p?from=' + encodeURIComponent(siteUrl) + '&ring=' + encodeURIComponent(ringUri);
                        p.textContent = 'Prev';
                        p.style.color = '#0070f3';
                        
                        const r = document.createElement('a');
                        r.href = baseUrl + '/r?ring=' + encodeURIComponent(ringUri);
                        r.textContent = labelRandom === 'Random' ? 'Random' : labelRandom;
                        r.style.color = '#0070f3';
                        
                        const n = document.createElement('a');
                        n.href = baseUrl + '/n?from=' + encodeURIComponent(siteUrl) + '&ring=' + encodeURIComponent(ringUri);
                        n.textContent = 'Next';
                        n.style.color = '#0070f3';
                        
                        links.appendChild(p);
                        links.appendChild(document.createTextNode('|'));
                        links.appendChild(r);
                        links.appendChild(document.createTextNode('|'));
                        links.appendChild(n);
                        div.appendChild(links);
                        previewArea.appendChild(div);
                        
                        // Update Code (Short URLs)
                        const htmlCode = '<div style="border: 1px solid #ccc; padding: 10px; border-radius: 8px; display: inline-block;">\\n' +
                                       '  <strong>' + labelTitle + '</strong><br/>\\n' + 
                                       '  <a href="' + baseUrl + '/p?from=' + encodeURIComponent(siteUrl) + '&ring=' + encodeURIComponent(ringUri) + '">Prev</a> | \\n' +
                                       '  <a href="' + baseUrl + '/r?ring=' + encodeURIComponent(ringUri) + '">' + (labelRandom === 'Random' ? 'Random' : labelRandom) + '</a> | \\n' +
                                       '  <a href="' + baseUrl + '/n?from=' + encodeURIComponent(siteUrl) + '&ring=' + encodeURIComponent(ringUri) + '">Next</a>\\n' +
                                       '</div>';
                        document.getElementById('w-code').textContent = htmlCode;
                    } else {
                        const nav = document.createElement('webring-nav');
                        nav.setAttribute('site', siteUrl);
                        nav.setAttribute('ring', ringUri);
                        if (theme !== 'system') nav.setAttribute('theme', theme);
                        if (layout !== 'default') nav.setAttribute('layout', layout);
                        if (transparent) nav.setAttribute('transparent', '');
                        if (currentBannerUrl) nav.setAttribute('banner', currentBannerUrl);
                        if (labelTitle !== 'Webring' && labelTitle !== "${ringTitle}") nav.setAttribute('label-title', labelTitle);
                        if (labelRandom !== 'Random') nav.setAttribute('label-random', labelRandom);
                        if (labelList !== 'List') nav.setAttribute('label-list', labelList);
                        if (customCss) nav.setAttribute('css', customCss);
                        
                        previewArea.appendChild(nav);

                        // Update Code
                        let tag = '<webring-nav site="' + siteUrl + '" ring="' + ringUri + '"';
                        if (theme !== 'system') tag += ' theme="' + theme + '"';
                        if (layout !== 'default') tag += ' layout="' + layout + '"';
                        if (transparent) tag += ' transparent';
                        if (currentBannerUrl) tag += ' banner="' + currentBannerUrl + '"';
                        if (labelTitle !== 'Webring' && labelTitle !== "${ringTitle}") tag += ' label-title="' + labelTitle + '"';
                        if (labelRandom !== 'Random') tag += ' label-random="' + labelRandom + '"';
                        if (labelList !== 'List') tag += ' label-list="' + labelList + '"';
                        if (customCss) tag += ' css="' + customCss + '"';
                        tag += '></webring-nav>';

                        const scriptTag = '<script src="' + baseUrl + '/nav/widget.js"><' + '/script>';
                        document.getElementById('w-code').textContent = scriptTag + '\\n' + tag;
                    }
                }

                async function uploadBanner() {
                    console.log("[Client] uploadBanner called (v2 - absolute path)");
                    const fileInput = document.getElementById('banner-upload');
                    if (!fileInput.files || fileInput.files.length === 0) return alert('${t("widget_builder.alert_select_file")}');
                    
                    const btn = document.getElementById('btn-upload');
                    const originalText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = 'Uploading...';

                    const formData = new FormData();
                    formData.append('banner', fileInput.files[0]);
                    formData.append('ring_uri', ringUri);

                    try {
                        const res = await fetch('/dashboard/ring/widget/upload-banner?_t=' + Date.now(), {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                            currentBannerUrl = data.url;
                            document.getElementById('banner-preview-img').src = data.url;
                            document.getElementById('banner-preview-img').classList.remove('hidden');
                            updatePreview();
                            alert('${t("widget_builder.alert_upload_success")}');
                        } else {
                            alert('${t("widget_builder.alert_upload_failed")}: ' + data.error);
                        }
                    } catch (e) {
                        console.error(e);
                        alert('${t("widget_builder.alert_upload_failed")}');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = originalText;
                    }
                }

                function copyCode() {
                    const code = document.getElementById('w-code').textContent;
                    navigator.clipboard.writeText(code).then(() => {
                        alert('${t("widget_builder.copy_tooltip")}');
                    });
                }

                window.addEventListener('load', updatePreview);
            </script>
        `,
        }),
    );
});

app.post("/upload-banner", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const banner = body.banner as Blob;
    const ringUri = body.ring_uri as string;

    pinoLogger.info({
        msg: "[UploadBanner] Received upload request",
        did,
        ringUri,
    });

    if (!banner || !ringUri) {
        return c.json(
            { success: false, error: "Missing banner or ring_uri" },
            400,
        );
    }

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) {
            pinoLogger.error({
                msg: "[UploadBanner] Failed to restore agent",
                did,
            });
            return c.json(
                { success: false, error: "Failed to restore agent" },
                401,
            );
        }

        // Create/Update Banner Record on PDS (includes blob upload)
        pinoLogger.info({
            msg: "[UploadBanner] Uploading banner to PDS",
            ringUri,
        });
        const arrayBuffer = await banner.arrayBuffer();
        const blob = await AtProtoService.setRingBanner(
            agent,
            ringUri,
            new Uint8Array(arrayBuffer),
            banner.type || "image/jpeg",
        );
        const cidString = blob.ref.toString();
        pinoLogger.info({
            msg: "[UploadBanner] Blob uploaded and record updated",
            cid: cidString,
            ringUri,
        });

        // 3. Update local DB with the banner URL (from PDS)
        // Note: The public URL for the blob: https://<pds-host>/xrpc/com.atproto.sync.getBlob?did=<did>&cid=<cid>
        const pdsUrl =
            (agent as any).service?.origin ||
            (agent as any).session?.pdsUrl ||
            "https://bsky.social";
        const bannerUrl = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cidString}`;
        pinoLogger.info({
            msg: "[UploadBanner] Constructed Banner URL",
            bannerUrl,
        });

        await c.env.DB.prepare("UPDATE rings SET banner_url = ? WHERE uri = ?")
            .bind(bannerUrl, ringUri)
            .run();
        pinoLogger.info({
            msg: "[UploadBanner] Local database updated",
            ringUri,
        });

        return c.json({ success: true, url: bannerUrl });
    } catch (e: any) {
        pinoLogger.error({ msg: "[UploadBanner] Upload failed", error: e });
        return c.json({ success: false, error: e.message }, 500);
    }
});

export default app;
