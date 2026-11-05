import { html } from "hono/html";

interface ChangelogViewProps {
    lang?: string;
    t: (key: string, options?: any) => string;
}

interface ChangelogEntry {
    version: string;
    date: string;
    title: { ja: string; en: string };
    items: Array<{
        type: "feature" | "improvement" | "fix" | "docs";
        text: { ja: string; en: string };
    }>;
}

const changelogData: ChangelogEntry[] = [
    {
        version: "v0.4.0",
        date: "2026-08",
        title: {
            ja: "アプリ内ヘルプ・チェンジログ新設 & ナビゲーション強化",
            en: "In-app Help, Changelog & Navigation Enhancements",
        },
        items: [
            {
                type: "feature",
                text: {
                    ja: "アプリ内ヘルプ画面（/help）を新設（利用ガイド、ショートカット一覧、FAQ）",
                    en: "Added in-app Help page (/help) with user guides, shortcut table, and FAQs",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "更新履歴（/changelog）画面を新設し、タイムライン表示に対応",
                    en: "Added Changelog page (/changelog) with timeline visualization",
                },
            },
            {
                type: "improvement",
                text: {
                    ja: "ヘッダーにアンテナ（/antenna）を追加し、フッターのナビゲーションリンクを体系化",
                    en: "Added Antenna (/antenna) to header and reorganized footer links",
                },
            },
            {
                type: "docs",
                text: {
                    ja: "ドキュメント（README、docs/help_ja.md、CHANGELOG.md）を更新・充実",
                    en: "Updated comprehensive documentation (README, docs/help_ja.md, CHANGELOG.md)",
                },
            },
        ],
    },
    {
        version: "v0.3.0",
        date: "2026-08",
        title: {
            ja: "Companion Navigation（コンパニオン巡回）& PWA 対応",
            en: "Companion Navigation & Progressive Web App (PWA)",
        },
        items: [
            {
                type: "feature",
                text: {
                    ja: "参加サイト無改造で巡回可能な独立型コンパニオンUI（/rings/companion）を実装",
                    en: "Standalone Companion Navigation UI (/rings/companion) for browsing without site modification",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "同一タブ再利用巡回（atcircle-visitコンテキスト）および閲覧履歴セッションの永続化",
                    en: "Same-tab browsing reuse and persistent navigation session storage",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "メイン画面とコンパニオン画面間のBroadcastChannel双方向同期",
                    en: "BroadcastChannel real-time sync between main dashboard and companion toolbar",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "キーボードショートカット対応（← / → / R / Enter, O）",
                    en: "Keyboard shortcuts navigation (← / → / R / Enter, O)",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "PWA（Progressive Web App）スタンドアロンインストールに対応",
                    en: "PWA standalone app installation support",
                },
            },
        ],
    },
    {
        version: "v0.2.0",
        date: "2026-07",
        title: {
            ja: "RSS アンテナ & OPML エクスポート",
            en: "RSS Antenna & OPML Export",
        },
        items: [
            {
                type: "feature",
                text: {
                    ja: "参加メンバーサイトの RSS / Atom フィードを集約表示するアンテナ機能（/antenna）",
                    en: "Unified RSS / Atom feed aggregation antenna (/antenna)",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "リングごとの参加メンバー RSS フィードを一括ダウンロードする OPML エクスポート",
                    en: "OPML export to batch-import ring member feeds into external RSS readers",
                },
            },
            {
                type: "improvement",
                text: {
                    ja: "定期的なフィード自動クロールおよび手動同期機能",
                    en: "Automated background feed crawling and manual feed sync",
                },
            },
        ],
    },
    {
        version: "v0.1.0",
        date: "2026-06",
        title: {
            ja: "ATProto OAuth & ウェブリング基盤リリース",
            en: "ATProto OAuth & Core Webring Release",
        },
        items: [
            {
                type: "feature",
                text: {
                    ja: "Bluesky / ATProto OAuth ログインとプロフィールからのサイト自動検出",
                    en: "Bluesky / ATProto OAuth authentication and auto-discovery of profile websites",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "ウェブリングの作成・参加・承認フロー・メンバー管理",
                    en: "Webring creation, join workflows, approval queues, and member moderation",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "埋め込みウィジェット（HTMLリンク、シンプル、バナー形式）およびウィジェットビルダー",
                    en: "Embeddable widgets (HTML link, Simple, Banner) and interactive widget builder",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "公開プロフィール（/u/ハンドル）および公開リングページ（/r/スラッグ）",
                    en: "Public profile pages (/u/handle) and public ring pages (/r/slug)",
                },
            },
        ],
    },
];

const renderBadge = (type: ChangelogEntry["items"][0]["type"], t: any) => {
    switch (type) {
        case "feature":
            return html`<span class="badge badge-primary badge-sm font-semibold">${t("changelog.badge_feature")}</span>`;
        case "improvement":
            return html`<span class="badge badge-info badge-sm font-semibold">${t("changelog.badge_improvement")}</span>`;
        case "fix":
            return html`<span class="badge badge-warning badge-sm font-semibold">${t("changelog.badge_fix")}</span>`;
        case "docs":
            return html`<span class="badge badge-neutral badge-sm font-semibold">${t("changelog.badge_docs")}</span>`;
    }
};

export const ChangelogView = ({ lang, t }: ChangelogViewProps) => {
    const isJa = lang === "ja" || !lang;

    return html`
        <div class="max-w-4xl mx-auto space-y-8">
            <!-- Header Banner -->
            <div class="bg-base-100 rounded-box border border-base-300 p-6 sm:p-8 shadow-sm">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                            <i class="fa-solid fa-clock-rotate-left"></i> ${t("common.changelog")}
                        </div>
                        <h1 class="text-3xl font-extrabold text-base-content tracking-tight">${t("changelog.title")}</h1>
                        <p class="mt-2 text-sm sm:text-base opacity-75 leading-relaxed">${t("changelog.subtitle")}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <a href="/help" class="btn btn-outline btn-sm gap-2">
                            <i class="fa-solid fa-circle-question"></i> ${t("common.help")}
                        </a>
                        <a href="https://github.com/asadaame5121/atcircle/releases" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm gap-2">
                            <i class="fa-brands fa-github"></i> Releases
                        </a>
                    </div>
                </div>
            </div>

            <!-- Timeline Entries -->
            <div class="space-y-6">
                ${changelogData.map(
                    (entry) => html`
                    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
                        <div class="card-header bg-base-200/50 px-6 py-4 border-b border-base-200 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <span class="badge badge-lg badge-primary font-mono font-bold">${entry.version}</span>
                                <h2 class="text-lg font-bold">${isJa ? entry.title.ja : entry.title.en}</h2>
                            </div>
                            <span class="text-xs font-semibold opacity-60 flex items-center gap-1.5">
                                <i class="fa-regular fa-calendar"></i> ${entry.date}
                            </span>
                        </div>
                        <div class="card-body p-6">
                            <ul class="space-y-3">
                                ${entry.items.map(
                                    (item) => html`
                                    <li class="flex items-start gap-3 text-sm">
                                        <div class="shrink-0 mt-0.5">${renderBadge(item.type, t)}</div>
                                        <span class="opacity-85 leading-relaxed">${isJa ? item.text.ja : item.text.en}</span>
                                    </li>
                                `,
                                )}
                            </ul>
                        </div>
                    </div>
                `,
                )}
            </div>

            <!-- Back to Help / Home -->
            <div class="text-center pt-4">
                <a href="/help" class="btn btn-ghost btn-sm gap-2">
                    <i class="fa-solid fa-arrow-left"></i> ${t("changelog.back_to_help")}
                </a>
            </div>
        </div>
    `;
};
