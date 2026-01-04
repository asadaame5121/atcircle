export const generateWidgetScript = (baseUrl: string) => `
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
             
        this.render(ring, theme, layout, customTitle, listUrl);
    }

    async render(ring, theme, layout, customTitle, listUrl) {
        if (!ring) return;

        const isDark = theme === "dark";
        const isVertical = layout === "vertical";
        const accentColor = isDark ? "#78b5ff" : "#0052d1";
        const bgColor = isDark ? "#1a1a1b" : "#ffffff";
        const textColor = isDark ? "#eeeeee" : "#333333";
        const borderColor = isDark ? "#333333" : "#e1e4e8";

        const title = customTitle || "Webring";
        const listHref = listUrl || "${baseUrl}/rings/view?ring=" + encodeURIComponent(ring);

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
                <a href="${baseUrl}" target="_blank" class="title">\${title}</a>
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
`;
