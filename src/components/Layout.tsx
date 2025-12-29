import { html } from "hono/html";

export const Layout = (props: {
    title: string;
    children: any;
    lang?: string;
    t?: (key: string) => string;
}) => html`
  <!DOCTYPE html>
  <html lang="${props.lang || "en"}" data-theme="light">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title}</title>
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" type="text/css" />
    <script src="https://cdn.tailwindcss.com"></script>
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
        <aside>
          <p class="font-bold text-primary">${props.t ? props.t("common.brand") : "ATcircle"}</p>
          <p class="text-xs opacity-60">${props.t ? props.t("common.footer_desc") : "Webring system for personal sites"}</p>
        </aside>
      </footer>
    </div>
  </body>
</html>
`;
