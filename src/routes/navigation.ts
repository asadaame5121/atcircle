import { Hono } from "hono";
import { Bindings } from "../types/bindings";

const app = new Hono<{ Bindings: Bindings }>();

// Helper to normalize URL for comparison (remove trailing slash)
const normalizeUrl = (u: string) => u.replace(/\/$/, "");

app.get("/random", async (c) => {
    const site = await c.env.DB.prepare(
        "SELECT url FROM sites WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1",
    ).first<{ url: string }>();
    if (site) {
        return c.redirect(site.url);
    }
    return c.text("No active sites in the ring yet!", 404);
});

app.get("/next", async (c) => {
    const from = c.req.query("from") || c.req.header("Referer");
    if (!from) return c.redirect("/nav/random"); // Fallback

    const sites = await c.env.DB.prepare(
        "SELECT id, url FROM sites WHERE is_active = 1 ORDER BY id ASC",
    ).all<{ id: number; url: string }>();
    if (!sites.results || sites.results.length === 0) {
        return c.text("No sites.", 404);
    }

    const list = sites.results;
    const normalizedFrom = normalizeUrl(from);
    let currentIndex = list.findIndex((s) =>
        normalizeUrl(s.url) === normalizedFrom
    );

    if (currentIndex === -1) currentIndex = -1;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= list.length) nextIndex = 0; // Loop

    return c.redirect(list[nextIndex].url);
});

app.get("/prev", async (c) => {
    const from = c.req.query("from") || c.req.header("Referer");
    if (!from) return c.redirect("/nav/random");

    const sites = await c.env.DB.prepare(
        "SELECT id, url FROM sites WHERE is_active = 1 ORDER BY id ASC",
    ).all<{ id: number; url: string }>();
    if (!sites.results || sites.results.length === 0) {
        return c.text("No sites.", 404);
    }

    const list = sites.results;
    const normalizedFrom = normalizeUrl(from);
    let currentIndex = list.findIndex((s) =>
        normalizeUrl(s.url) === normalizedFrom
    );

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = list.length - 1; // Loop

    return c.redirect(list[prevIndex].url);
});

app.get("/widget.js", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    const script = `
class WebringNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const site = this.getAttribute('site') || window.location.origin;
    const theme = this.getAttribute('theme') || 'system';
    const layout = this.getAttribute('layout') || 'default';
    const transparent = this.hasAttribute('transparent');
    const baseUrl = "${baseUrl}";

    const style = \`
      :host {
        display: inline-block;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        --wr-bg: #ffffff;
        --wr-text: #333333;
        --wr-border: rgba(255, 255, 255, 0.18);
        --wr-hover: rgba(0, 0, 0, 0.05);
        --wr-accent: #0070f3;
      }

      /* Dark Theme Variables */
      :host([theme="dark"]) {
        --wr-bg: #1a1a1a;
        --wr-text: #ffffff;
        --wr-border: #333;
        --wr-hover: rgba(255, 255, 255, 0.1);
      }

      /* System Theme Media Query */
      @media (prefers-color-scheme: dark) {
        :host([theme="system"]) {
            --wr-bg: #1a1a1a;
            --wr-text: #ffffff;
            --wr-border: #333;
            --wr-hover: rgba(255, 255, 255, 0.1);
        }
      }

      /* Transparency Override */
      :host([transparent]) {
        --wr-bg: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: none !important;
        border: none !important;
      }

      .webring-widget {
        background: var(--wr-bg);
        color: var(--wr-text);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid var(--wr-border);
        transition: all 0.3s ease;
      }

      /* Default Layout */
      .webring-widget.layout-default {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 50px;
        padding: 8px 16px;
        width: 300px;
      }

      /* Compact Layout */
      .webring-widget.layout-compact {
        display: grid;
        grid-template-columns: 40px 1fr 40px;
        grid-template-rows: auto auto;
        width: 200px;
        padding: 5px;
        border-radius: 8px;
        gap: 5px;
      }

      /* Common Elements */
      .webring-link {
        text-decoration: none;
        color: var(--wr-text);
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
      }
      .webring-link:hover {
        background: var(--wr-hover);
      }

      /* Nav Buttons */
      .nav-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%; /* Default circle */
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Compact Nav Buttons */
      .layout-compact .nav-btn {
        width: 100%;
        height: 30px;
        border-radius: 4px; /* Square in compact */
        background: var(--wr-hover); /* Always slight visible bg in compact */
      }

      /* Title Area */
      .webring-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      
      .webring-title {
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.8;
      }

      /* Layout Specific Adjustments */
      .layout-compact .webring-title {
        grid-column: 2;
        grid-row: 1;
        align-self: center;
        margin: 0;
        font-size: 0.9rem;
      }

      .layout-compact .nav-prev { grid-column: 1; grid-row: 1; }
      .layout-compact .nav-next { grid-column: 3; grid-row: 1; }

      /* Menu Actions */
      .webring-actions {
        display: flex;
        gap: 8px;
        font-size: 0.8rem;
      }

      .layout-compact .webring-actions {
        grid-column: 1 / -1;
        grid-row: 2;
        justify-content: center;
        border-top: 1px solid var(--wr-border);
        padding-top: 4px;
        gap: 12px;
      }
      
      .action-link {
         text-decoration: underline;
         font-size: 0.75rem;
         opacity: 0.8;
      }
      .join-link {
        color: var(--wr-accent);
        font-weight: bold;
      }
    \`;

    // HTML Structure Construction
    let content = '';

    if (layout === 'compact') {
        content = \`
            <div class="webring-widget layout-compact">
                <a href="\${baseUrl}/nav/prev?from=\${encodeURIComponent(site)}" class="webring-link nav-btn nav-prev">←</a>
                <span class="webring-title">Webring</span>
                <a href="\${baseUrl}/nav/next?from=\${encodeURIComponent(site)}" class="webring-link nav-btn nav-next">→</a>
                
                <div class="webring-actions">
                    <a href="\${baseUrl}/nav/random" class="webring-link action-link">Random</a>
                    <a href="\${baseUrl}" target="_blank" class="webring-link action-link join-link">Join us</a>
                    <a href="\${baseUrl}/sites" class="webring-link action-link">List</a>
                </div>
            </div>
        \`;
    } else {
        // Default Layout
        content = \`
            <div class="webring-widget layout-default">
                <a href="\${baseUrl}/nav/prev?from=\${encodeURIComponent(site)}" class="webring-link nav-btn">←</a>
                <div class="webring-info">
                    <span class="webring-title">Webring</span>
                    <div class="webring-actions">
                        <a href="\${baseUrl}/nav/random" class="webring-link action-link">Random</a>
                        <a href="\${baseUrl}/sites" class="webring-link action-link">List</a>
                        <a href="\${baseUrl}" target="_blank" class="webring-link action-link join-link">Join us</a>
                    </div>
                </div>
                <a href="\${baseUrl}/nav/next?from=\${encodeURIComponent(site)}" class="webring-link nav-btn">→</a>
            </div>
        \`;
    }

    this.shadowRoot.innerHTML = \`<style>\${style}</style>\${content}\`;
  }
}
customElements.define('webring-nav', WebringNav);
    `;
    return c.text(script, 200, { "Content-Type": "application/javascript" });
});

export default app;
