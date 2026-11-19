import { html, raw } from "hono/html";
import { safeHref } from "../../lib/html.js";
import { ProgressSteps } from "../ProgressSteps.js";

interface WidgetBuilderProps {
    ringUri: string;
    siteUrl: string;
    baseUrl: string;
    ringTitle: string;
    bannerUrl: string;
    t: (key: string, params?: any) => string;
    lang: string;
    /** 参加した直後なら true（画面上部で知らせる） */
    justJoined?: boolean;
}

interface WidgetPendingProps {
    ringTitle: string;
    site: { url: string; title: string };
    t: (key: string, params?: any) => string;
    /** 申請した直後なら true */
    justRequested?: boolean;
    /** 承認時の Bluesky 通知が有効なら true */
    notifyEnabled?: boolean;
    /** 通知を送る公式アカウントのハンドル */
    notifyHandle?: string;
}

/** 承認制リングの承認待ち画面。承認されるまで埋め込みコードは出さない */
export const WidgetPending = ({
    ringTitle,
    site,
    t,
    justRequested,
    notifyEnabled = false,
    notifyHandle = "atcircle.bsky.social",
}: WidgetPendingProps) => html`
    ${ProgressSteps({ current: 2, pending: true, t })}
    ${justRequested ? html`<p class="rt-flash">★ ${t("widget_builder.requested_flash", { ring: ringTitle })} ★</p>` : ""}
    <h1 class="rt-h1">■ ${t("widget_builder.pending_heading")} ■</h1>
    <div class="rt-find">
        <ol aria-label="${t("widget_builder.pending_steps_label")}" class="rt-box rt-steps rt-find-list">
            <li class="rt-box-title">${t("widget_builder.pending_steps_label")}</li>
            <li class="rt-step"><span aria-hidden="true" class="rt-check">✓</span> ${t("widget_builder.pending_step_requested")}</li>
            <li class="rt-step rt-step-now"><span aria-hidden="true" class="rt-mark">▶</span> <b>${t("widget_builder.pending_step_review")}</b></li>
            ${notifyEnabled ? html`<li class="rt-step"><span aria-hidden="true" class="rt-todo">□</span> ${t("widget_builder.pending_step_notify")}</li>` : ""}
            <li class="rt-step"><span aria-hidden="true" class="rt-todo">□</span> ${t("widget_builder.pending_step_widget")}</li>
            <li class="rt-step rt-step-foot"><a href="/dashboard">${t("widget_builder.to_dashboard")}</a></li>
        </ol>
        <aside aria-label="${t("widget_builder.pending_site")}" class="rt-panel rt-find-join">
            <h2 class="rt-panel-title">${t("widget_builder.pending_site")}</h2>
            <p class="rt-pending-site"><b>${site.title}</b><br><a href="${safeHref(site.url, "#")}" target="_blank" rel="noopener noreferrer">${site.url}</a></p>
            <p class="rt-note">${
                notifyEnabled
                    ? t("widget_builder.pending_note_notify", {
                          handle: `@${notifyHandle}`,
                      })
                    : t("widget_builder.pending_note")
            }</p>
        </aside>
    </div>
`;

/**
 * ウィジェットを貼る画面。
 * 埋め込みコード（HTML版・Web Components版）の中身はウィジェット本体のデザインそのものなので、
 * 生成処理は変更しないこと。
 */
export const WidgetBuilder = ({
    ringUri,
    siteUrl,
    baseUrl,
    ringTitle,
    bannerUrl,
    t,
    justJoined,
}: WidgetBuilderProps) => {
    return html`
        ${ProgressSteps({ current: 3, t })}
        ${justJoined ? html`<p class="rt-flash">★ ${t("widget_builder.joined_flash", { ring: ringTitle })} ★</p>` : ""}
        <h1 class="rt-h1">■ ${t("widget_builder.page_heading")} ■</h1>
        <div id="widget-builder"
            data-ring-uri="${ringUri}"
            data-site-url="${siteUrl}"
            data-base-url="${baseUrl}"
            data-ring-title="${ringTitle}"
            data-banner-url="${bannerUrl}"
            data-msg-copied="${t("widget_builder.copied")}"
            data-msg-copied-hint="${t("widget_builder.copied_hint")}"
            data-msg-copy-failed="${t("widget_builder.copy_failed")}"
            data-msg-copy="${t("widget_builder.copy")}"
            data-msg-select-file="${t("widget_builder.alert_select_file")}"
            data-msg-upload-success="${t("widget_builder.alert_upload_success")}"
            data-msg-upload-failed="${t("widget_builder.alert_upload_failed")}"
            data-msg-uploading="${t("widget_builder.uploading")}"
            data-msg-saving="${t("widget_builder.saving")}"
            data-msg-saved="${t("widget_builder.saved")}">
            <div class="rt-find">
                <section aria-label="${t("widget_builder.code_label")}" class="rt-panel rt-find-list">
                    <div role="group" aria-label="${t("widget_builder.format_label")}" class="rt-format">
                        <button type="button" class="rt-bevel" data-format="html" aria-pressed="true">${t("widget_builder.format_html")}</button>
                        <button type="button" class="rt-bevel" data-format="simple" aria-pressed="false">${t("widget_builder.format_wc")}</button>
                    </div>
                    <div class="rt-sunken rt-code"><pre><code id="w-code"></code></pre></div>
                    <button type="button" id="btn-copy" class="rt-bevel rt-go rt-block rt-copy">${t("widget_builder.copy")}</button>
                    <p role="status" id="copy-status" class="rt-copy-status"></p>
                    <p class="rt-right"><a href="/dashboard">${t("widget_builder.to_dashboard")}</a></p>
                </section>
                <aside aria-label="${t("widget_builder.preview")}" class="rt-box rt-find-join">
                    <div class="rt-box-title">${t("widget_builder.preview")}</div>
                    <div id="preview-area" class="rt-preview-area"></div>
                </aside>
            </div>

            <details class="rt-box rt-advanced">
                <summary class="rt-box-title">${t("widget_builder.advanced")}</summary>
                <div class="rt-advanced-body">
                    <p class="rt-note">${t("widget_builder.advanced_note")}</p>
                    <div class="rt-grid2">
                        <div>
                            <label class="rt-label" for="w-layout">${t("widget_builder.field_layout")}</label>
                            <select id="w-layout" class="rt-sunken rt-input">
                                <option value="html" selected>${t("widget_builder.layout_html")}</option>
                                <option value="simple">${t("widget_builder.layout_simple")}</option>
                                <option value="banner">${t("widget_builder.layout_banner")}</option>
                            </select>
                        </div>
                        <div>
                            <label class="rt-label" for="w-theme">${t("widget_builder.field_theme")}</label>
                            <select id="w-theme" class="rt-sunken rt-input">
                                <option value="system">${t("widget_builder.theme_system")}</option>
                                <option value="light">${t("widget_builder.theme_light")}</option>
                                <option value="dark">${t("widget_builder.theme_dark")}</option>
                            </select>
                        </div>
                    </div>
                    <label class="rt-check-label"><input type="checkbox" id="w-transparent" /> ${t("widget_builder.field_transparent")}</label>

                    <h3 class="rt-sub">${t("widget_builder.banner_section")}</h3>
                    <label class="rt-label" for="w-banner-url">${t("widget_builder.field_banner_url")}</label>
                    <input type="url" id="w-banner-url" class="rt-sunken rt-input" placeholder="https://example.com/banner.png" value="${bannerUrl}" />
                    <p class="rt-note">${t("widget_builder.field_banner_url_help")}</p>
                    <div class="rt-upload">
                        <img id="banner-preview-img" src="${safeHref(bannerUrl, "")}" alt="" class="rt-banner-thumb" ${bannerUrl ? "" : "hidden"} />
                        <input type="file" id="banner-upload" accept="image/jpeg,image/png,image/webp" aria-label="${t("widget_builder.banner_upload_desc")}" />
                        <button type="button" id="btn-upload" class="rt-bevel">${t("common.upload")}</button>
                    </div>
                    <p class="rt-note">${t("widget_builder.banner_upload_desc")}</p>

                    <h3 class="rt-sub">${t("widget_builder.labels_style_section")}</h3>
                    <div class="rt-grid2">
                        <div>
                            <label class="rt-label" for="w-label-title">${t("widget_builder.label_title")}</label>
                            <input type="text" id="w-label-title" class="rt-sunken rt-input" value="${ringTitle}" />
                        </div>
                        <div>
                            <label class="rt-label" for="w-label-random">${t("widget_builder.label_random")}</label>
                            <input type="text" id="w-label-random" class="rt-sunken rt-input" value="Random" />
                        </div>
                        <div>
                            <label class="rt-label" for="w-label-list">${t("widget_builder.label_list")}</label>
                            <input type="text" id="w-label-list" class="rt-sunken rt-input" value="List" />
                        </div>
                        <div>
                            <label class="rt-label" for="w-css">${t("widget_builder.label_css")}</label>
                            <input type="url" id="w-css" class="rt-sunken rt-input" placeholder="https://example.com/widget.css" />
                        </div>
                    </div>
                    <label class="rt-label" for="w-list-url">${t("widget_builder.field_list_url")}</label>
                    <input type="url" id="w-list-url" class="rt-sunken rt-input" placeholder="${baseUrl}/rings/view?ring=..." />
                    <p class="rt-note">${t("widget_builder.field_list_url_help")}</p>

                    <button type="button" id="btn-save" class="rt-bevel">${t("widget_builder.btn_save_settings")}</button>
                    <p role="status" id="adv-status" class="rt-copy-status"></p>
                </div>
            </details>
        </div>
        <script src="/nav/widget.js"></script>
        <script>${raw(builderScript)}</script>
    `;
};

// 埋め込みコードの生成部分（updatePreview）は従来のまま。値の受け渡しと操作部品だけを変えている
const builderScript = `
(function() {
    var root = document.getElementById('widget-builder');
    if (!root) return;
    var d = root.dataset;
    var ringUri = d.ringUri;
    var siteUrl = d.siteUrl;
    var baseUrl = d.baseUrl;
    var initialRingTitle = d.ringTitle;
    var currentBannerUrl = d.bannerUrl;
    var $ = function(id) { return document.getElementById(id); };

    function setStatus(id, text) {
        var el = $(id);
        if (el) el.textContent = text;
    }

    function syncFormatButtons() {
        var layout = $('w-layout').value;
        var buttons = root.querySelectorAll('[data-format]');
        for (var i = 0; i < buttons.length; i++) {
            var isHtml = buttons[i].dataset.format === 'html';
            buttons[i].setAttribute('aria-pressed', String(isHtml ? layout === 'html' : layout !== 'html'));
        }
    }

    function updateBannerFromUrl() {
        var url = $('w-banner-url').value;
        currentBannerUrl = url;
        var img = $('banner-preview-img');
        if (url) {
            img.src = url;
            img.hidden = false;
        } else {
            img.hidden = true;
        }
        updatePreview();
    }

    function updatePreview() {
        syncFormatButtons();
        setStatus('copy-status', '');
        $('btn-copy').textContent = d.msgCopy;
        const theme = document.getElementById('w-theme').value;
        const layout = document.getElementById('w-layout').value;
        const transparent = document.getElementById('w-transparent').checked;
        const labelTitle = document.getElementById('w-label-title').value;
        const labelRandom = document.getElementById('w-label-random').value;
        const labelList = document.getElementById('w-label-list').value;
        const customCss = document.getElementById('w-css').value;
        const customListUrl = document.getElementById('w-list-url').value;

        const previewArea = document.getElementById('preview-area');
        previewArea.innerHTML = '';

        if (layout === 'html') {
            const defaultListUrl = ringUri ? baseUrl + '/rings/view?ring=' + encodeURIComponent(ringUri) : baseUrl + '/rings';
            const listUrlToUse = customListUrl || defaultListUrl;

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

            const l = document.createElement('a');
            l.href = listUrlToUse;
            l.textContent = labelList;
            l.style.color = '#0070f3';

            links.appendChild(p);
            links.appendChild(document.createTextNode('|'));
            links.appendChild(r);
            links.appendChild(document.createTextNode('|'));
            links.appendChild(n);
            links.appendChild(document.createTextNode('|'));
            links.appendChild(l);
            div.appendChild(links);
            previewArea.appendChild(div);

            const htmlCode = '<div id="atcircle" style="border: 1px solid #ccc; padding: 10px; border-radius: 8px; display: inline-block;">\\n' +
                           '  <strong>' + labelTitle + '</strong><br/>\\n' +
                           '  <a href="' + baseUrl + '/p?from=' + encodeURIComponent(siteUrl) + '&ring=' + encodeURIComponent(ringUri) + '">Prev</a> | \\n' +
                           '  <a href="' + baseUrl + '/r?ring=' + encodeURIComponent(ringUri) + '">' + (labelRandom === 'Random' ? 'Random' : labelRandom) + '</a> | \\n' +
                           '  <a href="' + baseUrl + '/n?from=' + encodeURIComponent(siteUrl) + '&ring=' + encodeURIComponent(ringUri) + '">Next</a> | \\n' +
                           '  <a href="' + listUrlToUse + '">' + labelList + '</a>\\n' +
                           '</div>';
            document.getElementById('w-code').textContent = htmlCode;
        } else if (layout === 'banner') {
            const defaultListUrl = ringUri ? baseUrl + '/rings/view?ring=' + encodeURIComponent(ringUri) : baseUrl + '/rings';
            const listUrlToUse = customListUrl || defaultListUrl;
            const div = document.createElement('div');
            div.className = 'webring-widget layout-banner';

            const link = document.createElement('a');
            link.href = listUrlToUse;
            link.style.display = 'block';
            link.style.textDecoration = 'none';
            link.style.color = 'inherit';

            if (currentBannerUrl) {
                const img = document.createElement('img');
                img.src = currentBannerUrl;
                img.style.width = '100%';
                img.style.maxWidth = '300px';
                img.style.display = 'block';
                link.appendChild(img);
            } else {
                const title = document.createElement('span');
                title.textContent = labelTitle;
                title.style.fontWeight = 'bold';
                link.appendChild(title);
            }

            div.appendChild(link);
            previewArea.appendChild(div);

            let tag = '<webring-nav site="' + siteUrl + '" ring="' + ringUri + '" layout="banner"';
            if (theme !== 'system') tag += ' theme="' + theme + '"';
            if (transparent) tag += ' transparent';
            if (currentBannerUrl) tag += ' banner="' + currentBannerUrl + '"';
            if (labelTitle !== 'Webring' && labelTitle !== initialRingTitle) tag += ' label-title="' + labelTitle + '"';
            if (customListUrl) tag += ' list-url="' + customListUrl + '"';
            tag += '></webring-nav>';

            const scriptTag = '<script src="' + baseUrl + '/nav/widget.js"><' + '/script>';
            document.getElementById('w-code').textContent = scriptTag + '\\n' + tag;
        } else {
            const nav = document.createElement('webring-nav');
            nav.setAttribute('site', siteUrl);
            nav.setAttribute('ring', ringUri);
            if (theme !== 'system') nav.setAttribute('theme', theme);
            if (layout !== 'default') nav.setAttribute('layout', layout);
            if (transparent) nav.setAttribute('transparent', '');
            if (currentBannerUrl) nav.setAttribute('banner', currentBannerUrl);
            if (labelTitle !== 'Webring' && labelTitle !== initialRingTitle) nav.setAttribute('label-title', labelTitle);
            if (labelRandom !== 'Random') nav.setAttribute('label-random', labelRandom);
            if (labelList !== 'List') nav.setAttribute('label-list', labelList);
            if (customCss) nav.setAttribute('css', customCss);
            if (customListUrl) nav.setAttribute('list-url', customListUrl);

            previewArea.appendChild(nav);

            let tag = '<webring-nav site="' + siteUrl + '" ring="' + ringUri + '"';
            if (theme !== 'system') tag += ' theme="' + theme + '"';
            if (layout !== 'default') tag += ' layout="' + layout + '"';
            if (transparent) tag += ' transparent';
            if (currentBannerUrl) tag += ' banner="' + currentBannerUrl + '"';
            if (labelTitle !== 'Webring' && labelTitle !== initialRingTitle) tag += ' label-title="' + labelTitle + '"';
            if (labelRandom !== 'Random') tag += ' label-random="' + labelRandom + '"';
            if (labelList !== 'List') tag += ' label-list="' + labelList + '"';
            if (customCss) tag += ' css="' + customCss + '"';
            if (customListUrl) tag += ' list-url="' + customListUrl + '"';
            tag += '></webring-nav>';

            const scriptTag = '<script src="' + baseUrl + '/nav/widget.js"><' + '/script>';
            document.getElementById('w-code').textContent = scriptTag + '\\n' + tag;
        }
    }

    async function uploadBanner() {
        const fileInput = $('banner-upload');
        if (!fileInput.files || fileInput.files.length === 0) return setStatus('adv-status', d.msgSelectFile);

        const btn = $('btn-upload');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = d.msgUploading;

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
                $('banner-preview-img').src = data.url;
                $('banner-preview-img').hidden = false;
                updatePreview();
                setStatus('adv-status', d.msgUploadSuccess);
            } else {
                setStatus('adv-status', d.msgUploadFailed + ': ' + data.error);
            }
        } catch (e) {
            console.error(e);
            setStatus('adv-status', d.msgUploadFailed);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async function saveSettings() {
        const bannerUrlInput = $('w-banner-url').value;
        const btn = $('btn-save');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = d.msgSaving;

        try {
            const res = await fetch('/dashboard/ring/widget/save-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ring_uri: ringUri,
                    banner_url: bannerUrlInput
                })
            });
            const data = await res.json();
            setStatus('adv-status', data.success ? d.msgSaved : 'Save failed: ' + data.error);
        } catch (e) {
            console.error(e);
            setStatus('adv-status', 'Save failed');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function copyCode() {
        const code = $('w-code').textContent;
        const done = function() {
            $('btn-copy').textContent = d.msgCopied;
            setStatus('copy-status', d.msgCopiedHint);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(done, function() {
                setStatus('copy-status', d.msgCopyFailed);
            });
        } else {
            setStatus('copy-status', d.msgCopyFailed);
        }
    }

    var formatButtons = root.querySelectorAll('[data-format]');
    for (var i = 0; i < formatButtons.length; i++) {
        formatButtons[i].addEventListener('click', function(e) {
            var format = e.currentTarget.dataset.format;
            var layout = $('w-layout');
            if (format === 'html') layout.value = 'html';
            else if (layout.value === 'html') layout.value = 'simple';
            updatePreview();
        });
    }
    root.addEventListener('change', function(e) {
        if (e.target.id === 'banner-upload') return;
        if (e.target.id === 'w-banner-url') return updateBannerFromUrl();
        updatePreview();
    });
    root.addEventListener('input', function(e) {
        if (e.target.id === 'w-banner-url') return updateBannerFromUrl();
        if (e.target.tagName === 'INPUT' && e.target.type !== 'file' && e.target.type !== 'checkbox') updatePreview();
    });
    $('btn-copy').addEventListener('click', copyCode);
    $('btn-upload').addEventListener('click', uploadBanner);
    $('btn-save').addEventListener('click', saveSettings);

    updatePreview();
    // widget.js の読み込み後にもう一度描く（Web Components の定義待ち）
    window.addEventListener('load', updatePreview);
})();
`;
