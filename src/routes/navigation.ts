import { Hono } from "hono";
import { PUBLIC_URL } from "../config.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Helper to normalize URL for comparison (remove trailing slash)
const normalizeUrl = (u: string) => u.replace(/\/$/, "");

app.get("/random", async (c) => {
    const ring = c.req.query("ring");
    let site: any;
    if (ring) {
        site = await c.env.DB.prepare(
            `SELECT s.url FROM sites s 
             JOIN memberships m ON s.id = m.site_id 
             LEFT JOIN block_records b ON (b.ring_uri = m.ring_uri AND b.subject_did = s.user_did)
             WHERE s.is_active = 1 AND m.ring_uri = ? AND m.status = 'approved' AND b.uri IS NULL
             GROUP BY s.id
             ORDER BY RANDOM() LIMIT 1`,
        )
            .bind(ring)
            .first<{ url: string }>();
    } else {
        site = await c.env.DB.prepare(
            "SELECT url FROM sites WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1",
        ).first<{ url: string }>();
    }

    if (site) {
        return c.redirect(site.url);
    }
    return c.text("No active sites in the ring yet!", 404);
});

app.get("/next", async (c) => {
    const from = c.req.query("from") || c.req.header("Referer");
    const ring = c.req.query("ring");
    if (!from) {
        return c.redirect(
            `/nav/random${ring ? `?ring=${encodeURIComponent(ring)}` : ""}`,
        );
    }

    let sites: { results?: { id: number; url: string }[] };
    if (ring) {
        sites = await c.env.DB.prepare(
            `SELECT s.id, s.url FROM sites s 
             JOIN memberships m ON s.id = m.site_id 
             LEFT JOIN block_records b ON (b.ring_uri = m.ring_uri AND b.subject_did = s.user_did)
             WHERE s.is_active = 1 AND m.ring_uri = ? AND m.status = 'approved' AND b.uri IS NULL
             GROUP BY s.id
             ORDER BY s.id ASC`,
        )
            .bind(ring)
            .all<{ id: number; url: string }>();
    } else {
        sites = await c.env.DB.prepare(
            "SELECT id, url FROM sites WHERE is_active = 1 ORDER BY id ASC",
        ).all<{ id: number; url: string }>();
    }

    if (!sites.results || sites.results.length === 0) {
        return c.text("No sites.", 404);
    }

    const list = sites.results;
    const normalizedFrom = normalizeUrl(from);
    let currentIndex = list.findIndex(
        (s) => normalizeUrl(s.url) === normalizedFrom,
    );

    if (currentIndex === -1) currentIndex = -1;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= list.length) nextIndex = 0; // Loop

    return c.redirect(list[nextIndex].url);
});

app.get("/prev", async (c) => {
    const from = c.req.query("from") || c.req.header("Referer");
    const ring = c.req.query("ring");
    if (!from) {
        return c.redirect(
            `/nav/random${ring ? `?ring=${encodeURIComponent(ring)}` : ""}`,
        );
    }

    let sites: { results?: { id: number; url: string }[] };
    if (ring) {
        sites = await c.env.DB.prepare(
            `SELECT s.id, s.url FROM sites s 
             JOIN memberships m ON s.id = m.site_id 
             LEFT JOIN block_records b ON (b.ring_uri = m.ring_uri AND b.subject_did = s.user_did)
             WHERE s.is_active = 1 AND m.ring_uri = ? AND m.status = 'approved' AND b.uri IS NULL
             GROUP BY s.id
             ORDER BY s.id ASC`,
        )
            .bind(ring)
            .all<{ id: number; url: string }>();
    } else {
        sites = await c.env.DB.prepare(
            "SELECT id, url FROM sites WHERE is_active = 1 ORDER BY id ASC",
        ).all<{ id: number; url: string }>();
    }

    if (!sites.results || sites.results.length === 0) {
        return c.text("No sites.", 404);
    }

    const list = sites.results;
    const normalizedFrom = normalizeUrl(from);
    const currentIndex = list.findIndex(
        (s) => normalizeUrl(s.url) === normalizedFrom,
    );

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = list.length - 1; // Loop

    return c.redirect(list[prevIndex].url);
});

app.get("/widget.js", (c) => {
    const baseUrl = PUBLIC_URL;
    const script = `
class WebringNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const site = this.getAttribute('site') || window.location.origin;
    const ring = this.getAttribute('ring') || '';
    const theme = this.getAttribute('theme') || 'system';
    const layout = this.getAttribute('layout') || 'default';
    const transparent = this.hasAttribute('transparent');
    const banner = this.getAttribute('banner') || '';
    const customCss = this.getAttribute('css') || '';
    
    // Custom Labels
    const labelTitle = this.getAttribute('label-title') || 'AT CIRCLE';
    const labelRandom = this.getAttribute('label-random') || 'Random';
    const labelList = this.getAttribute('label-list') || 'List';

    const baseUrl = "${baseUrl}";

    const ringParam = ring ? \`&ring=\${encodeURIComponent(ring)}\` : '';
    const ringRandomParam = ring ? \`?ring=\${encodeURIComponent(ring)}\` : '';

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
        overflow: hidden;
      }

      /* Banner Stylings */
      .webring-banner {
        width: 100%;
        display: block;
      }
      .webring-banner img {
        width: 100%;
        height: auto;
        display: block;
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

      /* Simple Layout */
      .webring-widget.layout-simple {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 300px;
        border-radius: 12px;
        padding: 10px;
        gap: 8px;
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

      /* Webring Info */
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

      .webring-actions {
        display: flex;
        gap: 8px;
        font-size: 0.8rem;
      }

      /* Simple Layout Specific */
      .layout-simple .webring-nav-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.1rem;
      }
      .layout-simple .current-indicator {
        font-weight: bold;
        font-size: 0.9rem;
      }
    \`;

    const bannerHtml = banner ? \`<div class="webring-banner"><img src="\${banner}" alt="AT CIRCLE Banner"></div>\` : '';
    const cssHtml = customCss ? \`<link rel="stylesheet" href="\${customCss}">\` : '';

    let content = '';

    if (layout === 'compact') {
        content = \`
            <div class="webring-widget layout-compact">
                \${bannerHtml}
                <a href="\${baseUrl}/nav/prev?from=\${encodeURIComponent(site)}\${ringParam}" class="webring-link nav-btn nav-prev">←</a>
                <span class="webring-title">\${labelTitle}</span>
                <a href="\${baseUrl}/nav/next?from=\${encodeURIComponent(site)}\${ringParam}" class="webring-link nav-btn nav-next">→</a>
                
                <div class="webring-actions">
                    <a href="\${baseUrl}/nav/random\${ringRandomParam}" class="webring-link action-link">\${labelRandom}</a>
                    <a href="\${ring ? \`\${baseUrl}/rings/view?ring=\${encodeURIComponent(ring)}\` : \`\${baseUrl}/rings\`}" class="webring-link action-link">\${labelList}</a>
                </div>
            </div>
        \`;
    } else if (layout === 'simple') {
        content = \`
            <div class="webring-widget layout-simple">
                 \${bannerHtml}
                 <div class="webring-nav-controls">
                    <a href="\${baseUrl}/nav/prev?from=\${encodeURIComponent(site)}\${ringParam}" class="webring-link">← prev</a>
                    <span class="current-indicator">\${labelTitle}</span>
                    <a href="\${baseUrl}/nav/next?from=\${encodeURIComponent(site)}\${ringParam}" class="webring-link">next →</a>
                 </div>
                 <div class="webring-actions">
                    <a href="\${baseUrl}/nav/random\${ringRandomParam}" class="webring-link action-link">\${labelRandom}</a>
                    <a href="\${ring ? \`\${baseUrl}/rings/view?ring=\${encodeURIComponent(ring)}\` : \`\${baseUrl}/rings\`}" class="webring-link action-link">\${labelList}</a>
                 </div>
            </div>
        \`;
    } else if (layout === 'banner') {
        const listUrl = ring ? \`\${baseUrl}/rings/view?ring=\${encodeURIComponent(ring)}\` : \`\${baseUrl}/rings\`;
        content = \`
            <div class="webring-widget layout-banner">
                <a href="\${listUrl}" class="webring-link">
                    \${bannerHtml || \`<span class="webring-title">\${labelTitle}</span>\`}
                </a>
            </div>
        \`;
    } else {
        // Default Layout
        content = \`
            <div class="webring-widget layout-default">
                <a href="\${baseUrl}/nav/prev?from=\${encodeURIComponent(site)}\${ringParam}" class="webring-link nav-btn">←</a>
                <div class="webring-info">
                    \${bannerHtml}
                    <span class="webring-title">\${labelTitle}</span>
                    <div class="webring-actions">
                        <a href="\${baseUrl}/nav/random\${ringRandomParam}" class="webring-link action-link">\${labelRandom}</a>
                        <a href="\${ring ? \`\${baseUrl}/rings/view?ring=\${encodeURIComponent(ring)}\` : \`\${baseUrl}/rings\`}" class="webring-link action-link">\${labelList}</a>
                    </div>
                </div>
                <a href="\${baseUrl}/nav/next?from=\${encodeURIComponent(site)}\${ringParam}" class="webring-link nav-btn">→</a>
            </div>
        \`;
    }

    this.shadowRoot.innerHTML = \`<style>\${style}</style>\${cssHtml}\${content}\`;
  }
}
customElements.define('webring-nav', WebringNav);
    `;
    return c.text(script, 200, { "Content-Type": "application/javascript" });
});

export default app;
