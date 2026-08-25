import { html } from "hono/html";
import { PUBLIC_URL } from "../config.js";

export const Layout = (props: {
    title: string;
    children: any;
    lang?: string;
    t?: (key: string) => string;
    isDebug?: boolean;
    ogImage?: string;
}) => {
    const description = props.t ? props.t("seo.description") : "";
    const keywords = props.t ? props.t("seo.keywords") : "";
    const ogImage = props.ogImage || "/assets/ogp.png";
    const favicon = "/assets/favicon.png";

    return html`
  <!DOCTYPE html>
  <html lang="${props.lang || "en"}" data-theme="light">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    
    <!-- OGP -->
    <meta property="og:title" content="${props.title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${PUBLIC_URL}">
    <meta property="og:image" content="${ogImage}">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${props.title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${ogImage}">

    <link rel="icon" type="image/png" href="${favicon}">
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" type="text/css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
    <link href="/assets/index.css" rel="stylesheet" />
    <style>
      /* Custom overrides for responsive layout */
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        overflow-x: hidden;
      }
      .container { 
        width: 100% !important; 
        max-width: 1200px !important; 
        margin-left: auto; 
        margin-right: auto; 
        padding-left: 0.75rem !important; 
        padding-right: 0.75rem !important; 
      }
      
      /* Ensure everything stays within viewport */
      * { max-width: 100%; box-sizing: border-box; }
    </style>
  </head>
  <body class="bg-base-200 min-h-screen">
    <div class="container mx-auto p-4">
      ${
          props.isDebug
              ? html`
      <div class="alert alert-warning py-1 px-3 mb-2 rounded-lg text-xs font-bold flex justify-center gap-2">
        <i class="fa-solid fa-bug"></i> DEBUG MODE (Virtual Login)
      </div>
      `
              : ""
}
      
        <header class="navbar bg-base-100/90 backdrop-blur sticky top-0 z-30 shadow-sm rounded-box mb-4">
          <div class="navbar-start min-w-0">
            <a href="/" class="flex items-center gap-1 btn btn-ghost px-1 min-w-0 max-w-full">
              <img src="${favicon}" alt="AT CIRCLE Logo" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm shrink-0" />
              <span class="text-lg sm:text-xl text-primary font-black italic tracking-tighter truncate min-w-0">${props.t ? props.t("common.brand") : "AT CIRCLE"}</span>
            </a>
          </div>
          <div class="navbar-end hidden sm:flex gap-1">
            <a href="/rings" class="btn btn-ghost btn-sm font-medium">${props.t ? props.t("common.rings") : "Rings"}</a>
            <a href="/dashboard" class="btn btn-ghost btn-sm font-medium">${props.t ? props.t("common.dashboard") : "Dashboard"}</a>
            <a href="https://asadaame5121.net/Article/help_ja.html" target="_blank" rel="noopener noreferrer"
               class="btn btn-ghost btn-sm font-normal opacity-80 hover:opacity-100">
              <i class="fa-solid fa-circle-question mr-1"></i>
              ${props.t ? props.t("common.help") : "Help"}
            </a>
            <a href="https://github.com/asadaame5121/atcircle" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-circle btn-sm" aria-label="GitHub">
              <i class="fa-brands fa-github text-lg"></i>
            </a>
          </div>
          <div class="navbar-end sm:hidden">
            <details class="dropdown dropdown-end">
              <summary class="btn btn-ghost btn-sm" aria-label="${props.t ? props.t("common.menu") : "Menu"}">
                <i class="fa-solid fa-bars text-lg"></i>
              </summary>
              <ul class="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52 mt-2">
                <li><a href="/rings"><i class="fa-solid fa-circle-nodes w-4"></i>${props.t ? props.t("common.rings") : "Rings"}</a></li>
                <li><a href="/dashboard"><i class="fa-solid fa-gauge w-4"></i>${props.t ? props.t("common.dashboard") : "Dashboard"}</a></li>
                <li><a href="https://asadaame5121.net/Article/help_ja.html" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-circle-question w-4"></i>${props.t ? props.t("common.help") : "Help"}</a></li>
                <li><a href="https://github.com/asadaame5121/atcircle" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github w-4"></i>GitHub</a></li>
              </ul>
            </details>
          </div>
        </header>
      ${props.children}
      <footer class="footer p-10 bg-base-100 text-base-content rounded-box shadow-lg mt-12 grid-cols-1 md:grid-cols-3">
        <nav>
          <h6 class="footer-title">${props.t ? props.t("common.legal") : "Legal"}</h6> 
          <a href="/terms" class="link link-hover">${props.t ? props.t("common.terms") : "Terms of Use"}</a>
          <a href="/privacy" class="link link-hover">${props.t ? props.t("common.privacy") : "Privacy Policy"}</a>
        </nav>
        <nav>
          <h6 class="footer-title">${props.t ? props.t("common.share") : "Share"}</h6>
          <div class="flex gap-4">
            <a href="https://bsky.app/intent/compose?text=${encodeURIComponent(`${props.t ? props.t("seo.description") : ""} ${PUBLIC_URL}`)}" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="${props.t ? props.t("common.share_on_bluesky") : "Bluesky"}" aria-label="${props.t ? props.t("common.share_on_bluesky") : "Bluesky"}">
              <i class="fa-brands fa-bluesky text-lg"></i>
            </a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(props.t ? props.t("seo.description") : "")}&url=${encodeURIComponent(PUBLIC_URL)}" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="${props.t ? props.t("common.share_on_twitter") : "Twitter"}" aria-label="${props.t ? props.t("common.share_on_twitter") : "Twitter"}">
              <i class="fa-brands fa-x-twitter text-lg"></i>
            </a>
            <a href="https://github.com/asadaame5121/atcircle" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub">
              <i class="fa-brands fa-github text-lg"></i>
            </a>
            <a href="https://www.buymeacoffee.com/asadaame5121" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="${props.t ? props.t("common.buy_me_a_coffee") : "Buy me a coffee"}" aria-label="${props.t ? props.t("common.buy_me_a_coffee") : "Buy me a coffee"}">
              <i class="fa-solid fa-mug-hot text-lg"></i>
            </a>
          </div>
        </nav>
        <aside class="md:col-span-3 border-t border-base-300 pt-6 w-full">
          <p class="font-bold text-primary">${props.t ? props.t("common.brand") : "ATcircle"}</p>
          <p class="text-xs opacity-60">${props.t ? props.t("common.footer_desc") : "Webring system for personal sites"}</p>
          <p class="mt-2">
            <a href="https://bsky.app/profile/asadaame5121.bsky.social" class="link link-primary text-xs" target="_blank" rel="noopener noreferrer">
               ${props.t ? props.t("common.contact") : "Contact (Bluesky)"}
            </a>
          </p>
        </aside>
      </footer>
    </div>
    <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
  </body>
</html>
`;
};
