import { html } from "hono/html";

interface HelpViewProps {
    lang?: string;
    t: (key: string, options?: any) => string;
}

export const HelpView = ({ lang, t }: HelpViewProps) => {
    const isJa = lang === "ja" || !lang;

    return html`
        <div class="max-w-4xl mx-auto space-y-8">
            <!-- Header Banner -->
            <div class="bg-base-100 rounded-box border border-base-300 p-6 sm:p-8 shadow-sm">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                            <i class="fa-solid fa-book-open"></i> ${t("common.help")}
                        </div>
                        <h1 class="text-3xl font-extrabold text-base-content tracking-tight">${t("help.title")}</h1>
                        <p class="mt-2 text-sm sm:text-base opacity-75 leading-relaxed">${t("help.subtitle")}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 shrink-0">
                        <a href="/changelog" class="btn btn-outline btn-sm gap-2">
                            <i class="fa-solid fa-clock-rotate-left"></i> ${t("common.changelog")}
                        </a>
                        <a href="/rings" class="btn btn-primary btn-sm gap-2">
                            <i class="fa-solid fa-circle-nodes"></i> ${t("common.rings")}
                        </a>
                    </div>
                </div>

                <!-- Quick Navigation Badges -->
                <div class="mt-6 pt-6 border-t border-base-200">
                    <p class="text-xs font-bold uppercase tracking-wider opacity-60 mb-3">${t("help.quick_links")}</p>
                    <div class="flex flex-wrap gap-2 text-xs">
                        <a href="#getting-started" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-rocket text-xs"></i> ${t("help.section_getting_started")}
                        </a>
                        <a href="#rings-guide" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-circle-nodes text-xs"></i> ${t("help.section_rings")}
                        </a>
                        <a href="#widget-guide" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-code text-xs"></i> ${t("help.section_widget")}
                        </a>
                        <a href="#companion-guide" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-compass text-xs"></i> ${t("help.section_companion")}
                        </a>
                        <a href="#antenna-guide" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-tower-broadcast text-xs"></i> ${t("help.section_antenna")}
                        </a>
                        <a href="#faq" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-circle-question text-xs"></i> ${t("help.section_faq")}
                        </a>
                        <a href="#docs" class="badge badge-lg badge-ghost hover:badge-primary transition gap-1.5 py-3">
                            <i class="fa-solid fa-file-lines text-xs"></i> ${t("help.section_links")}
                        </a>
                    </div>
                </div>
            </div>

            <!-- 1. Getting Started -->
            <section id="getting-started" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-rocket"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_getting_started")}</h2>
                            <p class="text-xs opacity-60">${t("help.getting_started_desc")}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div class="p-4 rounded-xl bg-base-200/60 border border-base-200">
                            <div class="flex items-center gap-2 text-primary font-bold mb-2">
                                <span class="badge badge-primary badge-sm">1</span>
                                <span>${isJa ? "Bluesky でログイン" : "Login with Bluesky"}</span>
                            </div>
                            <p class="text-xs opacity-80 leading-relaxed">
                                ${
                                    isJa
                                        ? "Bluesky ハンドルを入力し、ATProto OAuth で安全にログインします。パスワードを入力する必要はありません。"
                                        : "Enter your Bluesky handle and log in securely using ATProto OAuth without sharing passwords."
                                }
                            </p>
                        </div>
                        <div class="p-4 rounded-xl bg-base-200/60 border border-base-200">
                            <div class="flex items-center gap-2 text-primary font-bold mb-2">
                                <span class="badge badge-primary badge-sm">2</span>
                                <span>${isJa ? "サイトを登録" : "Register Site"}</span>
                            </div>
                            <p class="text-xs opacity-80 leading-relaxed">
                                ${
                                    isJa
                                        ? "あなたの個人ブログやウェブサイトの URL を登録します。RSS Feed URL を設定するとアンテナにも掲載されます。"
                                        : "Register your blog or website URL. Add an RSS Feed URL to publish updates to the antenna."
                                }
                            </p>
                        </div>
                        <div class="p-4 rounded-xl bg-base-200/60 border border-base-200">
                            <div class="flex items-center gap-2 text-primary font-bold mb-2">
                                <span class="badge badge-primary badge-sm">3</span>
                                <span>${isJa ? "リングに参加・作成" : "Join or Create"}</span>
                            </div>
                            <p class="text-xs opacity-80 leading-relaxed">
                                ${
                                    isJa
                                        ? "興味のあるウェブリングを探して参加するか、自分好みのテーマで新しいウェブリングを立ち上げましょう。"
                                        : "Explore existing webrings to join, or create your own curated webring around your favorite topics."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 2. Rings Guide -->
            <section id="rings-guide" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-circle-nodes"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_rings")}</h2>
                            <p class="text-xs opacity-60">${isJa ? "リングへの参加方法と作成者の管理機能" : "How to join rings and manage member permissions"}</p>
                        </div>
                    </div>

                    <div class="space-y-4 text-sm opacity-90 leading-relaxed">
                        <div class="bg-base-200/40 p-4 rounded-xl border border-base-200 space-y-2">
                            <h3 class="font-bold text-base flex items-center gap-2">
                                <i class="fa-solid fa-right-to-bracket text-primary text-xs"></i>
                                ${isJa ? "参加の流れと承認方式" : "Joining Flow and Approval Types"}
                            </h3>
                            <p>
                                ${
                                    isJa
                                        ? "「ウェブリングを探す」からリング詳細を開き、「参加する」をクリックします。承認方式には「自動承認（即時参加）」と「要承認（オーナーの承認待ち）」があります。"
                                        : "Open a ring from 'Explore Webrings' and click Join. Rings can be 'Auto-approved' (instant) or 'Requires approval' (reviewed by the ring owner)."
                                }
                            </p>
                        </div>

                        <div class="bg-base-200/40 p-4 rounded-xl border border-base-200 space-y-2">
                            <h3 class="font-bold text-base flex items-center gap-2">
                                <i class="fa-solid fa-sliders text-secondary text-xs"></i>
                                ${isJa ? "リング作成とメンバー管理" : "Ring Creation & Member Moderation"}
                            </h3>
                            <p>
                                ${
                                    isJa
                                        ? "ダッシュボードの「ウェブリング作成」から作成できます。公開URLスラッグ（/r/スラッグ名）、説明文、バナー画像を設定可能です。オーナーはメンバーの承認、キック（削除）、ブロック（追放）を行えます。"
                                        : "Create a ring from Dashboard. Set a custom URL slug (/r/slug), description, and banner. Owners can approve requests, kick members, or block malicious sites."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 3. Widget Guide -->
            <section id="widget-guide" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-code"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_widget")}</h2>
                            <p class="text-xs opacity-60">${isJa ? "自分のウェブサイトへの設置コードと形式" : "Embedding code formats for your website"}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div class="p-4 rounded-xl bg-base-200/50 border border-base-200">
                            <div class="font-bold text-sm mb-1 text-primary">HTML リンク形式</div>
                            <p class="opacity-75 mb-2">${isJa ? "スクリプト不使用。HTML制限のあるブログでも安全に動作します。" : "No JavaScript. Safe for strict blog platforms."}</p>
                            <span class="badge badge-xs badge-neutral">No-JS 対応</span>
                        </div>
                        <div class="p-4 rounded-xl bg-base-200/50 border border-base-200">
                            <div class="font-bold text-sm mb-1 text-primary">シンプル形式</div>
                            <p class="opacity-75 mb-2">${isJa ? "<webring-nav> タグと widget.js による標準ウィジェット。" : "Standard web component with <webring-nav> and widget.js."}</p>
                            <span class="badge badge-xs badge-primary">テーマ切替対応</span>
                        </div>
                        <div class="p-4 rounded-xl bg-base-200/50 border border-base-200">
                            <div class="font-bold text-sm mb-1 text-primary">バナー形式</div>
                            <p class="opacity-75 mb-2">${isJa ? "リングバナーやロゴ画像を表示して一覧へ誘導するリンク。" : "Displays ring banner linking to the member list."}</p>
                            <span class="badge badge-xs badge-secondary">画像リンク</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 4. Companion Guide -->
            <section id="companion-guide" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-compass"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_companion")}</h2>
                            <p class="text-xs opacity-60">${t("help.companion_desc")}</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <p class="text-sm opacity-80 leading-relaxed">
                            ${
                                isJa
                                    ? "Companion Navigation は、参加サイト側にウィジェットがなくても独立したツールバーウィンドウから前後のサイトを快適に巡回できる機能です（/rings/companion）。同一タブで巡回先サイトが開き、訪問履歴やショートカット操作に対応しています。"
                                    : "Companion Navigation allows browsing ring members through a standalone toolbar without requiring widget code on third-party sites. It reuses the browsing tab and persists history."
                            }
                        </p>

                        <div class="overflow-x-auto">
                            <table class="table table-sm bg-base-200/40 rounded-xl border border-base-200">
                                <thead>
                                    <tr class="text-xs opacity-70">
                                        <th>${isJa ? "キー" : "Key"}</th>
                                        <th>${isJa ? "動作" : "Action"}</th>
                                        <th>${isJa ? "説明" : "Description"}</th>
                                    </tr>
                                </thead>
                                <tbody class="text-xs">
                                    <tr>
                                        <td><kbd class="kbd kbd-sm">←</kbd></td>
                                        <td class="font-bold">${isJa ? "前のサイトへ" : "Previous Site"}</td>
                                        <td class="opacity-70">${isJa ? "訪問履歴を逆順に戻る" : "Traverse visit history backwards"}</td>
                                    </tr>
                                    <tr>
                                        <td><kbd class="kbd kbd-sm">→</kbd></td>
                                        <td class="font-bold">${isJa ? "次のサイトへ" : "Next Site"}</td>
                                        <td class="opacity-70">${isJa ? "リング内の次のサイトへ進む" : "Advance to next site in ring"}</td>
                                    </tr>
                                    <tr>
                                        <td><kbd class="kbd kbd-sm">R</kbd></td>
                                        <td class="font-bold">${isJa ? "ランダム" : "Random Site"}</td>
                                        <td class="opacity-70">${isJa ? "リング内のメンバーへランダムジャンプ" : "Jump to random member"}</td>
                                    </tr>
                                    <tr>
                                        <td><kbd class="kbd kbd-sm">Enter</kbd> / <kbd class="kbd kbd-sm">O</kbd></td>
                                        <td class="font-bold">${isJa ? "サイトを開く" : "Open / Visit"}</td>
                                        <td class="opacity-70">${isJa ? "現在選択中のサイトを巡回用タブで開く" : "Open currently selected site in visit tab"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 5. Antenna Guide -->
            <section id="antenna-guide" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-tower-broadcast"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_antenna")}</h2>
                            <p class="text-xs opacity-60">${isJa ? "RSS フィードの集約表示と OPML エクスポート" : "Aggregated RSS feeds and OPML export"}</p>
                        </div>
                    </div>

                    <div class="text-sm opacity-85 leading-relaxed space-y-3">
                        <p>
                            ${
                                isJa
                                    ? "登録サイトに RSS Feed URL を設定しておくと、アンテナ画面（/antenna）で参加メンバーの最新記事がタイムライン形式で表示されます。"
                                    : "Setting an RSS Feed URL enables member updates to appear on the Antenna page (/antenna) in a unified timeline."
                            }
                        </p>
                        <p>
                            ${
                                isJa
                                    ? "また、各リング詳細ページの「OPML出力」ボタンから、参加メンバー全員の RSS フィードをまとめた OPML ファイルをダウンロードし、お気に入りの RSS リーダーに一括登録できます。"
                                    : "You can also download an OPML file from any ring detail page to batch-import all member feeds into your favorite RSS reader."
                            }
                        </p>
                    </div>
                </div>
            </section>

            <!-- 6. FAQ -->
            <section id="faq" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-circle-question"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_faq")}</h2>
                            <p class="text-xs opacity-60">${isJa ? "トラブルの対処とよくある質問" : "Frequently Asked Questions & Troubleshooting"}</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div class="collapse collapse-arrow bg-base-200/50 border border-base-200 rounded-xl">
                            <input type="checkbox" checked />
                            <div class="collapse-title font-bold text-sm">
                                ${t("help.faq_login_q")}
                            </div>
                            <div class="collapse-content text-xs opacity-80 leading-relaxed">
                                <p>${t("help.faq_login_a")}</p>
                            </div>
                        </div>

                        <div class="collapse collapse-arrow bg-base-200/50 border border-base-200 rounded-xl">
                            <input type="checkbox" />
                            <div class="collapse-title font-bold text-sm">
                                ${t("help.faq_widget_q")}
                            </div>
                            <div class="collapse-content text-xs opacity-80 leading-relaxed">
                                <p>${t("help.faq_widget_a")}</p>
                            </div>
                        </div>

                        <div class="collapse collapse-arrow bg-base-200/50 border border-base-200 rounded-xl">
                            <input type="checkbox" />
                            <div class="collapse-title font-bold text-sm">
                                ${t("help.faq_sync_q")}
                            </div>
                            <div class="collapse-content text-xs opacity-80 leading-relaxed">
                                <p>${t("help.faq_sync_a")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 7. Docs & Spec Links -->
            <section id="docs" class="card bg-base-100 border border-base-300 shadow-sm scroll-mt-20">
                <div class="card-body p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-file-lines"></i>
                        </div>
                        <div>
                            <h2 class="card-title text-xl font-bold">${t("help.section_links")}</h2>
                            <p class="text-xs opacity-60">${t("help.docs_link_text")}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <a href="https://github.com/asadaame5121/atcircle/blob/main/docs/development-maintenance.md" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition border border-base-200 text-xs font-semibold">
                            <span class="flex items-center gap-2"><i class="fa-solid fa-wrench text-primary"></i> ${isJa ? "開発・保守マニュアル" : "Dev & Maintenance Manual"}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square opacity-50"></i>
                        </a>
                        <a href="https://github.com/asadaame5121/atcircle/blob/main/docs/spec/atproto_crud.md" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition border border-base-200 text-xs font-semibold">
                            <span class="flex items-center gap-2"><i class="fa-solid fa-database text-secondary"></i> ${isJa ? "ATProto CRUD 仕様" : "ATProto CRUD Spec"}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square opacity-50"></i>
                        </a>
                        <a href="https://github.com/asadaame5121/atcircle/blob/main/docs/lexicons.md" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition border border-base-200 text-xs font-semibold">
                            <span class="flex items-center gap-2"><i class="fa-solid fa-code text-accent"></i> ${isJa ? "Lexicon リファレンス" : "Lexicon Reference"}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square opacity-50"></i>
                        </a>
                        <a href="https://github.com/asadaame5121/atcircle" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition border border-base-200 text-xs font-semibold">
                            <span class="flex items-center gap-2"><i class="fa-brands fa-github"></i> ${isJa ? "GitHub リポジトリ" : "GitHub Repository"}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square opacity-50"></i>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
};
