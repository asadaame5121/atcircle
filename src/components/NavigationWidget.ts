export const generateWidgetScript = (baseUrl: string) => `
(() => {
if (customElements.get("webring-nav")) return;

const __atcEsc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const __atcUrl = (v, fallback) => {
    try {
        const u = new URL(String(v), window.location.href);
        if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (e) {}
    return fallback;
};

class WebringNav extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        const ring = this.getAttribute("ring");
        const theme = this.getAttribute("theme") || "light";
        const layout = this.getAttribute("layout") || "horizontal";
        const customTitle = this.getAttribute("title");
        const listUrl = this.getAttribute("list-url"); // Custom list button URL
        const banner = this.getAttribute("banner"); // Banner URL
             
        this.render(ring, theme, layout, customTitle, listUrl, banner);
        this.ping(ring);
    }

    // 設置の確認のため、表示されたことを AT CIRCLE に知らせる（1ページにつきリングごと1回）。
    // AT CIRCLE 自身の画面（取得画面のプレビュー）では知らせない
    ping(ring) {
        try {
            if (!ring || window.location.origin === new URL("${baseUrl}").origin) return;
            const sent = (window.__atcPinged = window.__atcPinged || {});
            if (sent[ring]) return;
            sent[ring] = true;
            const site = this.getAttribute("site") || window.location.href;
            const img = new Image();
            img.referrerPolicy = "no-referrer";
            img.src = "${baseUrl}/nav/ping?ring=" + encodeURIComponent(ring) + "&site=" + encodeURIComponent(site);
        } catch (e) {}
    }

    async render(ring, theme, layout, customTitle, listUrl, banner) {

        if (!ring) return;

        const isDark = theme === "dark";
        // Force vertical layout if banner is present
        const isVertical = layout === "vertical" || !!banner;
        const accentColor = isDark ? "#78b5ff" : "#0052d1";
        const bgColor = isDark ? "#1a1a1b" : "#ffffff";
        const textColor = isDark ? "#eeeeee" : "#333333";
        const borderColor = isDark ? "#333333" : "#e1e4e8";

        const defaultListHref = "${baseUrl}/rings/view?ring=" + encodeURIComponent(ring);
        const title = __atcEsc(customTitle || "Webring");
        const listHref = __atcEsc(listUrl ? __atcUrl(listUrl, defaultListHref) : defaultListHref);
        const bannerSrc = banner ? __atcEsc(__atcUrl(banner, "")) : "";

        // Header content: Banner Image or Text Title
        let headerHtml = "";
        if (bannerSrc) {
             headerHtml = \`
                <a href="${baseUrl}" target="_blank" class="banner-link">
                    <img src="\${bannerSrc}" alt="\${title}" class="banner-img" />
                </a>
             \`;
        } else {
             headerHtml = \`
                <a href="${baseUrl}" target="_blank" class="title">\${title}</a>
             \`;
        }

        this.shadowRoot.innerHTML = \`
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .container {
                    display: flex;
                    flex-direction: \${isVertical ? "column" : "row"};
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: \${bgColor};
                    color: \${textColor};
                    border: 1px solid \${borderColor};
                    border-radius: 12px;
                    font-size: 14px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                .title {
                    font-weight: 800;
                    color: \${accentColor};
                    text-decoration: none;
                    font-style: italic;
                    letter-spacing: -0.02em;
                }
                .title:hover {
                    text-decoration: underline;
                }
                .banner-link {
                    display: block;
                    text-decoration: none;
                    line-height: 0; 
                }
                .banner-img {
                    max-width: 100%;
                    height: auto;
                    object-fit: contain;
                    display: block;
                    border-radius: 4px; /* Optional: slight rounding for banner */
                }
                .nav-links {
                    display: flex;
                    gap: 8px;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px 12px;
                    border-radius: 20px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 12px;
                    transition: all 0.2s;
                    border: 1px solid \${borderColor};
                    background: transparent;
                    color: \${textColor};
                    white-space: nowrap;
                }
                .btn:hover {
                    background: \${accentColor};
                    color: white;
                    border-color: \${accentColor};
                    transform: translateY(-1px);
                }
                .btn-primary {
                    background: \${accentColor}10;
                    color: \${accentColor};
                    border-color: \${accentColor}30;
                }
            </style>
            <div class="container">
                \${headerHtml}
                <div class="nav-links">
                    <a href="${baseUrl}/nav/prev?ring=\${encodeURIComponent(ring)}&from=\${encodeURIComponent(window.location.href)}" class="btn">Prev</a>
                    <a href="${baseUrl}/nav/random?ring=\${encodeURIComponent(ring)}" class="btn">Random</a>
                    <a href="${baseUrl}/nav/next?ring=\${encodeURIComponent(ring)}&from=\${encodeURIComponent(window.location.href)}" class="btn">Next</a>
                    <a href="\${listHref}" target="_blank" class="btn btn-primary">List</a>
                </div>
            </div>
        \`;
    }
}

customElements.define("webring-nav", WebringNav);
})();
`;
