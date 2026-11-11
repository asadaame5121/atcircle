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
        version: "v0.5.0",
        date: "2026-11",
        title: {
            ja: "90年代後半風デザインに刷新 & 参加の流れを整理",
            en: "Late-90s redesign & simpler joining flow",
        },
        items: [
            {
                type: "improvement",
                text: {
                    ja: "全画面を90年代後半の個人サイト風デザインに刷新（丸ゴシック、スマホ幅にも対応）",
                    en: "Redesigned every page in a late-90s personal-site style (rounded gothic font, mobile friendly)",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "ログイン → リングに入る → ウィジェットを貼る の3ステップで迷わない流れに",
                    en: "A clear 3-step flow: log in → join a ring → paste the widget",
                },
            },
            {
                type: "feature",
                text: {
                    ja: "ログイン時にハンドル候補を表示。リングの検索と、新しいリングを立ち上げる画面を追加",
                    en: "Handle suggestions on login, ring search, and a new page to start a ring",
                },
            },
            {
                type: "improvement",
                text: {
                    ja: "承認制リングは承認されるまでコードを出さず、承認待ちの画面とダッシュボード表示を追加",
                    en: "Approval-based rings now show a waiting page and dashboard status until approved",
                },
            },
        ],
    },
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

const BADGE_CLASS: Record<ChangelogEntry["items"][0]["type"], string> = {
    feature: "rt-tag-feature",
    improvement: "rt-tag-auto",
    fix: "rt-tag-manual",
    docs: "rt-tag-off",
};

const renderBadge = (type: ChangelogEntry["items"][0]["type"], t: any) =>
    html`<span class="rt-tag ${BADGE_CLASS[type]}">${t(`changelog.badge_${type}`)}</span>`;

export const ChangelogView = ({ lang, t }: ChangelogViewProps) => {
    const isJa = lang === "ja" || !lang;

    return html`
        <h1 class="rt-h1">■ ${t("changelog.title")} ■</h1>
        <p class="rt-lead">${t("changelog.subtitle")}<br>
            <a href="https://github.com/asadaame5121/atcircle/releases" target="_blank" rel="noopener noreferrer">GitHub Releases</a>
        </p>
        ${changelogData.map(
            (entry) => html`
            <section class="rt-box rt-section" aria-labelledby="cl-${entry.version}">
                <h2 id="cl-${entry.version}" class="rt-box-title">${entry.version} ｜ ${entry.date} ｜ ${isJa ? entry.title.ja : entry.title.en}</h2>
                <ul class="rt-ring-list">
                    ${entry.items.map(
                        (item, i) => html`
                        <li class="rt-ring-row rt-changelog-item${i === 0 ? " rt-ring-row-first" : ""}">
                            ${renderBadge(item.type, t)}
                            <span>${isJa ? item.text.ja : item.text.en}</span>
                        </li>
                    `,
                    )}
                </ul>
            </section>
        `,
        )}
        <p class="rt-right"><a href="/help">${t("changelog.back_to_help")}</a></p>
    `;
};
