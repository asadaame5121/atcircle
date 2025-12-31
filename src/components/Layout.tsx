import { html } from "hono/html";
import { PUBLIC_URL } from "../config.js";

export const Layout = (props: {
    title: string;
    children: any;
    lang?: string;
    t?: (key: string) => string;
}) => {
    const description = props.t ? props.t("seo.description") : "";
    const keywords = props.t ? props.t("seo.keywords") : "";
    const ogImage = `${PUBLIC_URL}/assets/ogp.png`;
    const favicon = `${PUBLIC_URL}/assets/favicon.png`;

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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <link href="/assets/index.css" rel="stylesheet" />
    <style>
      /* Custom overrides for responsive layout */
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        overflow-x: hidden;
      }
      .container { 
        width: 100% !important; 
        max-width: 896px !important; 
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
    <div class="container mx-auto p-4 max-w-4xl">
      <header class="navbar bg-base-100 rounded-box shadow-lg mb-8">
        <div class="navbar-start">
          <div class="dropdown">
            <div tabindex="0" role="button" class="btn btn-ghost lg:hidden pr-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
            </div>
            <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-20 p-2 shadow bg-base-100 rounded-box w-52">
              <li><a href="/">${props.t ? props.t("common.home") : "Home"}</a></li>
              <li><a href="/rings">${props.t ? props.t("common.rings") : "Rings"}</a></li>
              <li><a href="/dashboard">${props.t ? props.t("common.dashboard") : "Dashboard"}</a></li>
            </ul>
          </div>
          <a href="/" class="btn btn-ghost text-xl text-primary font-black italic tracking-tighter px-2">${props.t ? props.t("common.brand") : "ATcircle"}</a>
        </div>
        <div class="navbar-end">
          <ul class="menu menu-horizontal px-1 gap-1 hidden lg:flex">
            <li><a href="/">${props.t ? props.t("common.home") : "Home"}</a></li>
            <li><a href="/rings">${props.t ? props.t("common.rings") : "Rings"}</a></li>
            <li><a href="/dashboard">${props.t ? props.t("common.dashboard") : "Dashboard"}</a></li>
          </ul>
          <a href="https://github.com/asadaame5121/atcircle" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-circle btn-sm">
            <i class="fa-brands fa-github text-lg"></i>
          </a>
        </div>
      </header>
      ${props.children}
      <footer class="footer p-10 bg-base-100 text-base-content rounded-box shadow-lg mt-12 grid-cols-1 md:grid-cols-3">
        <nav>
          <h6 class="footer-title">Services</h6> 
          <a href="/rings" class="link link-hover">${props.t ? props.t("common.rings") : "Webrings"}</a>
          <a href="/antenna" class="link link-hover">${props.t ? props.t("common.antenna") : "Antenna"}</a>
        </nav> 
        <nav>
          <h6 class="footer-title">Legal</h6> 
          <a href="/terms" class="link link-hover">${props.t ? props.t("common.terms") : "Terms of Use"}</a>
          <a href="/privacy" class="link link-hover">${props.t ? props.t("common.privacy") : "Privacy Policy"}</a>
        </nav>
        <nav>
          <h6 class="footer-title">${props.t ? props.t("common.share") : "Share"}</h6>
          <div class="flex gap-4">
            <a href="https://bsky.app/intent/compose?text=${encodeURIComponent(`${props.t ? props.t("seo.description") : ""} ${PUBLIC_URL}`)}" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="${props.t ? props.t("common.share_on_bluesky") : "Bluesky"}">
              <i class="fa-brands fa-bluesky text-lg"></i>
            </a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(props.t ? props.t("seo.description") : "")}&url=${encodeURIComponent(PUBLIC_URL)}" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="${props.t ? props.t("common.share_on_twitter") : "Twitter"}">
              <i class="fa-brands fa-x-twitter text-lg"></i>
            </a>
            <a href="https://github.com/asadaame5121/atcircle" class="btn btn-ghost btn-circle btn-sm" target="_blank" rel="noopener noreferrer" title="GitHub">
              <i class="fa-brands fa-github text-lg"></i>
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
  <!-- BuyMeACoffee -->
  <script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="asadaame5121" data-color="#FFDD00" data-emoji=""  data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff" ></script>
</html>
`;
};
