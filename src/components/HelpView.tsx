import { html } from "hono/html";

interface HelpViewProps {
    lang?: string;
    t: (key: string, options?: any) => string;
}

const DOC_LINKS = [
    {
        href: "https://github.com/asadaame5121/atcircle/blob/main/docs/development-maintenance.md",
        ja: "開発・保守マニュアル",
        en: "Dev & Maintenance Manual",
    },
    {
        href: "https://github.com/asadaame5121/atcircle/blob/main/docs/spec/atproto_crud.md",
        ja: "ATProto CRUD 仕様",
        en: "ATProto CRUD Spec",
    },
    {
        href: "https://github.com/asadaame5121/atcircle/blob/main/docs/lexicons.md",
        ja: "Lexicon リファレンス",
        en: "Lexicon Reference",
    },
    {
        href: "https://github.com/asadaame5121/atcircle",
        ja: "GitHub リポジトリ",
        en: "GitHub Repository",
    },
];

export const HelpView = ({ lang, t }: HelpViewProps) => {
    const isJa = lang === "ja" || !lang;
    const L = (ja: string, en: string) => (isJa ? ja : en);

    const sections = [
        ["getting-started", t("help.section_getting_started")],
        ["rings-guide", t("help.section_rings")],
        ["widget-guide", t("help.section_widget")],
        ["companion-guide", t("help.section_companion")],
        ["antenna-guide", t("help.section_antenna")],
        ["faq", t("help.section_faq")],
        ["docs", t("help.section_links")],
    ];

    return html`
        <h1 class="rt-h1">■ ${t("help.title")} ■</h1>
        <p class="rt-lead">${t("help.subtitle")}</p>

        <nav aria-label="${t("help.quick_links")}" class="rt-box rt-section">
            <h2 class="rt-box-title">${t("help.quick_links")}</h2>
            <ol class="rt-toc">
                ${sections.map(([id, label]) => html`<li><a href="#${id}">${label}</a></li>`)}
            </ol>
        </nav>

        <article class="rt-prose">
            <section id="getting-started">
                <h2>${t("help.section_getting_started")}</h2>
                <p class="rt-note">${t("help.getting_started_desc")}</p>
                <ol>
                    <li><b>${L("ログイン", "Log in")}</b> — ${L(
                        "Bluesky などの Atproto ハンドルを入力し、ATProto OAuth で安全にログインします。パスワードを入力する必要はありません。",
                        "Enter your Atproto handle (e.g. Bluesky) and log in securely with ATProto OAuth. No password is shared.",
                    )}</li>
                    <li><b>${L("リングに入る", "Join a ring")}</b> — ${L(
                        "「リングを探す」でリングを選んで参加するか、「立ち上げる」で新しいリングを作ります。サイトの URL と名前はこのとき登録されます。",
                        "Pick a ring in “Find rings” and join it, or start a new one. Your site URL and name are registered at this step.",
                    )}</li>
                    <li><b>${L("ウィジェットを貼る", "Paste the widget")}</b> — ${L(
                        "表示されたコードをコピーして、自分のサイトのフッターなどに貼り付けます。",
                        "Copy the code shown and paste it into your site, e.g. in the footer.",
                    )}</li>
                </ol>
            </section>

            <section id="rings-guide">
                <h2>${t("help.section_rings")}</h2>
                <h3>${L("参加の流れと承認方式", "Joining flow and approval types")}</h3>
                <p>${L(
                    "リングには「自動承認（すぐに参加）」と「承認制（オーナーの確認待ち）」があります。承認制のリングでは、承認されるまでウィジェットのコードは表示されません。承認待ちの間はダッシュボードに「承認待ち」と表示され、申請を取り消すこともできます。",
                    "Rings are either auto-approved (instant) or approval-based (reviewed by the owner). For approval-based rings, the widget code is shown only after approval. While waiting, your dashboard shows the request and lets you withdraw it.",
                )}</p>
                <h3>${L("リング作成とメンバー管理", "Creating a ring and managing members")}</h3>
                <p>${L(
                    "「リングを探す」→「立ち上げる」から作成できます。作成後はダッシュボードの「…」メニューの「リング設定」で、公開URL（/r/スラッグ名）、説明文、バナー画像、参加の受け付け方を変更できます。オーナーはメンバーの承認、キック（削除）、ブロック（追放）を行えます。",
                    "Create one from “Find rings” → “Start one”. Afterwards, use “Ring settings” in the “…” menu on your dashboard to set a custom URL (/r/slug), description, banner and approval type. Owners can approve requests, kick members, or block sites.",
                )}</p>
            </section>

            <section id="widget-guide">
                <h2>${t("help.section_widget")}</h2>
                <dl>
                    <dt>${L("HTML版（おすすめ）", "HTML (recommended)")}</dt>
                    <dd>${L(
                        "スクリプトを使わないリンクだけのコードです。HTMLに制限のあるブログでも動作します。",
                        "Plain links with no JavaScript. Works even on blog platforms with strict HTML rules.",
                    )}</dd>
                    <dt>Web Components</dt>
                    <dd>${L(
                        "<webring-nav> タグと widget.js による表示です。「詳しい設定」でテーマ・透過・ラベルを変えられます。",
                        "Uses the <webring-nav> tag and widget.js. Theme, transparency and labels can be changed in “Advanced settings”.",
                    )}</dd>
                    <dt>${L("バナー", "Banner")}</dt>
                    <dd>${L(
                        "リングのバナー画像を表示して一覧へ誘導するリンクです（Web Components 版の「詳しい設定」で選べます）。",
                        "Shows the ring banner linking to the member list (choose it in the Web Components “Advanced settings”).",
                    )}</dd>
                </dl>
            </section>

            <section id="companion-guide">
                <h2>${t("help.section_companion")}</h2>
                <p class="rt-note">${t("help.companion_desc")}</p>
                <p>${L(
                    "Companion Navigation は、参加サイト側にウィジェットがなくても、独立した小さなウィンドウから前後のサイトを巡回できる機能です（/rings/companion）。同じタブで巡回先のサイトが開き、訪問履歴やキーボード操作に対応しています。",
                    "Companion Navigation lets you browse ring members from a small standalone window, without widget code on the member sites (/rings/companion). It reuses one browsing tab and keeps your visit history.",
                )}</p>
                <div class="rt-table-wrap">
                    <table class="rt-table">
                        <thead>
                            <tr><th>${L("キー", "Key")}</th><th>${L("動作", "Action")}</th><th>${L("説明", "Description")}</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><kbd>←</kbd></td><td>${L("前のサイトへ", "Previous site")}</td><td>${L("訪問履歴を逆順に戻る", "Go back through visit history")}</td></tr>
                            <tr><td><kbd>→</kbd></td><td>${L("次のサイトへ", "Next site")}</td><td>${L("リング内の次のサイトへ進む", "Advance to the next site")}</td></tr>
                            <tr><td><kbd>R</kbd></td><td>${L("ランダム", "Random")}</td><td>${L("リング内のメンバーへランダムに移動", "Jump to a random member")}</td></tr>
                            <tr><td><kbd>Enter</kbd> / <kbd>O</kbd></td><td>${L("サイトを開く", "Open site")}</td><td>${L("選択中のサイトを巡回用タブで開く", "Open the current site in the visit tab")}</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="antenna-guide">
                <h2>${t("help.section_antenna")}</h2>
                <p>${L(
                    "サイトに RSS の URL を設定しておくと、アンテナ（/antenna）に参加メンバーの最新記事が新しい順に並びます。",
                    "If your site has an RSS URL, member updates appear on the Antenna page (/antenna), newest first.",
                )}</p>
                <p>${L(
                    "各リングのページの「OPML」から、参加メンバー全員の RSS をまとめた OPML ファイルをダウンロードし、RSS リーダーに一括登録できます。",
                    "Use “OPML” on any ring page to download all member feeds and import them into your RSS reader at once.",
                )}</p>
            </section>

            <section id="faq">
                <h2>${t("help.section_faq")}</h2>
                <details open>
                    <summary>${t("help.faq_login_q")}</summary>
                    <p>${t("help.faq_login_a")}</p>
                </details>
                <details>
                    <summary>${t("help.faq_widget_q")}</summary>
                    <p>${t("help.faq_widget_a")}</p>
                </details>
                <details>
                    <summary>${t("help.faq_sync_q")}</summary>
                    <p>${t("help.faq_sync_a")}</p>
                </details>
            </section>

            <section id="docs">
                <h2>${t("help.section_links")}</h2>
                <p class="rt-note">${t("help.docs_link_text")}</p>
                <ul>
                    ${DOC_LINKS.map(
                        (d) =>
                            html`<li><a href="${d.href}" target="_blank" rel="noopener noreferrer">${L(d.ja, d.en)}</a></li>`,
                    )}
                    <li><a href="/changelog">${t("common.changelog")}</a></li>
                </ul>
            </section>
        </article>
    `;
};
