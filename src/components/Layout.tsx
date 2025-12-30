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
    <link href="/assets/index.css" rel="stylesheet" />
    <style>
      /* Custom overrides if needed */
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    </style>
  </head>
  <body class="bg-base-200 min-h-screen">
    <div class="container mx-auto p-4 max-w-4xl">
      <header class="navbar bg-base-100 rounded-box shadow-lg mb-8">
        <div class="flex-1">
          <a href="/" class="btn btn-ghost text-xl text-primary">${props.t ? props.t("common.brand") : "ATcircle"}</a>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            <li><a href="/">${props.t ? props.t("common.home") : "Home"}</a></li>
            <li><a href="/rings">${props.t ? props.t("common.rings") : "Rings"}</a></li>
            <li><a href="/antenna">${props.t ? props.t("common.antenna") : "Antenna"}</a></li>
            <li><a href="/dashboard">${props.t ? props.t("common.dashboard") : "Dashboard"}</a></li>
          </ul>
        </div>
      </header>
      ${props.children}
      <footer class="footer p-10 bg-base-100 text-base-content rounded-box shadow-lg mt-12">
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
          <div class="grid grid-flow-col gap-4">
            <a href="https://bsky.app/intent/compose?text=${encodeURIComponent(`${props.t ? props.t("seo.description") : ""} ${PUBLIC_URL}`)}" class="link link-hover" target="_blank" rel="noopener noreferrer">
              ${props.t ? props.t("common.share_on_bluesky") : "Bluesky"}
            </a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(props.t ? props.t("seo.description") : "")}&url=${encodeURIComponent(PUBLIC_URL)}" class="link link-hover" target="_blank" rel="noopener noreferrer">
              ${props.t ? props.t("common.share_on_twitter") : "Twitter"}
            </a>
          </div>
        </nav>
        <aside>
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
  </body>
  <!-- BuyMeACoffee -->
  <script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="asadaame5121" data-color="#FFDD00" data-emoji=""  data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff" ></script>
  <!-- Cloudflare Web Analytics -->
  <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "15352b80eeac4249885a8aa15fde8930"}'></script>
</html>
`;
};
