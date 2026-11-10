import { html } from "hono/html";
import { PUBLIC_URL } from "../config.js";

export type NavKey = "rings" | "antenna" | "dashboard" | "help";

const SA_BADGE_LINK =
    "https://www.simpleanalytics.com?utm_source=at-circle.asadaame5121.net&utm_content=badge";
const SA_BADGE_IMG =
    "https://simpleanalyticsbadges.com/at-circle.asadaame5121.net?background=transparent&text=677779&logo=677779&border=677779&radius=3&border-width=1&counter=false";

export const Layout = (props: {
    title: string;
    children: any;
    lang?: string;
    t?: (key: string) => string;
    isDebug?: boolean;
    ogImage?: string;
    /** ナビで現在地として示すページ */
    current?: NavKey;
    /** 未ログインのトップ用。ナビを「ログインせずにリングを見る」だけにする */
    guest?: boolean;
    /** ヘッダーとナビの間に出す帯（「リングを探す」の流れる文字） */
    ticker?: any;
}) => {
    const t = (key: string, fallback: string) =>
        props.t ? props.t(key) : fallback;
    const description = props.t ? props.t("seo.description") : "";
    const keywords = props.t ? props.t("seo.keywords") : "";
    const ogImage = props.ogImage || "/assets/ogp.png";
    const favicon = "/assets/favicon.png";

    const navItems: { key: NavKey; href: string; label: string }[] = [
        {
            key: "rings",
            href: "/rings",
            label: t("common.find_rings", "Find Rings"),
        },
        {
            key: "antenna",
            href: "/antenna",
            label: t("common.antenna", "Antenna"),
        },
        {
            key: "dashboard",
            href: "/dashboard",
            label: t("common.dashboard", "Dashboard"),
        },
        { key: "help", href: "/help", label: t("common.help", "Help") },
    ];

    const nav = props.guest
        ? html`<a href="/rings">[ ${t("common.browse_without_login", "Browse rings without logging in")} ]</a>`
        : navItems.map((item) =>
              item.key === props.current
                  ? html`<a href="${item.href}" aria-current="page">[ ${item.label} ]</a>`
                  : html`<a href="${item.href}">[ ${item.label} ]</a>`,
          );

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
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Kosugi+Maru&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" type="text/css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
    <link href="/assets/index.css" rel="stylesheet" />
  </head>
  <body class="rt-body">
    <div class="rt-frame">
      ${
          props.isDebug
              ? html`<div class="rt-debug" role="status">DEBUG MODE (Virtual Login)</div>`
              : ""
}
      <header class="rt-header">
        <a href="/" class="rt-logo rt-logo-main">${t("common.brand", "AT CIRCLE")}</a>
        <div class="rt-logo rt-tagline">～ ATProto WebRing ～</div>
      </header>
      ${props.ticker ?? ""}
      <nav aria-label="${t("common.main_nav", "Main")}" class="rt-nav">${nav}</nav>
      <main class="rt-main">
      ${props.children}
      </main>
      <footer class="rt-footer">
        <div class="rt-footer-badges">
          <a href="${SA_BADGE_LINK}" referrerpolicy="origin" target="_blank" rel="noopener"><img src="${SA_BADGE_IMG}" alt="Simple Analytics" width="210" height="50" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" class="rt-sa-badge" /></a>
        </div>
        <div class="rt-footer-links">
          <a href="/terms">${t("common.terms", "Terms of Use")}</a> ｜
          <a href="/privacy">${t("common.privacy", "Privacy Policy")}</a> ｜
          <a href="/changelog">${t("common.changelog", "Changelog")}</a> ｜
          <a href="https://github.com/asadaame5121/atcircle" target="_blank" rel="noopener noreferrer">GitHub</a> ｜
          <a href="https://bsky.app/profile/asadaame5121.bsky.social" target="_blank" rel="noopener noreferrer">${t("common.contact", "Contact (Bluesky)")}</a>
        </div>
        <div class="rt-footer-links">
          <a href="https://bsky.app/intent/compose?text=${encodeURIComponent(`${description} ${PUBLIC_URL}`)}" target="_blank" rel="noopener noreferrer">${t("common.share_on_bluesky", "Share on Bluesky")}</a> ｜
          <a href="https://www.buymeacoffee.com/asadaame5121" target="_blank" rel="noopener noreferrer">${t("common.buy_me_a_coffee", "Buy me a coffee")}</a>
        </div>
      </footer>
    </div>
    <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
  </body>
</html>
`;
};
