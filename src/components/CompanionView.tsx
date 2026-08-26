import { html, raw } from "hono/html";
import type { NavigationMember } from "../lib/navigation-session.js";

interface CompanionViewProps {
    ring: {
        uri: string;
        title: string;
        description?: string | null;
        banner_url?: string | null;
        slug?: string | null;
    };
    members: NavigationMember[];
    initialMemberUri?: string | null;
    lang?: string;
    t: (key: string, options?: any) => string;
}

/**
 * Generates the client-side JavaScript for the Companion Navigation UI.
 */
function generateCompanionScript(
    ringUri: string,
    initialMembers: NavigationMember[],
    initialMemberUri: string | null,
): string {
    return `
    (function() {
        const ringUri = ${JSON.stringify(ringUri)};
        let members = ${JSON.stringify(initialMembers)};
        const initialMemberUri = ${JSON.stringify(initialMemberUri)};
        const storageKey = "atcircle_session_" + encodeURIComponent(ringUri);
        const channelName = "atcircle_nav_" + encodeURIComponent(ringUri);
        const LAST_RING_KEY = "atcircle_last_session_ring";

        let channel = null;
        try {
            if (typeof BroadcastChannel !== "undefined") {
                channel = new BroadcastChannel(channelName);
            }
        } catch (e) {}

        function normalizeWebUrl(url) {

            if (!url || typeof url !== "string") return null;
            const trimmed = url.trim();
            if (!trimmed) return null;
            const lower = trimmed.toLowerCase();
            if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:") || lower.startsWith("file:")) {
                return null;
            }
            try {
                let u = trimmed;
                if (!/^https?:\\/\\//i.test(trimmed)) {
                    u = "https://" + trimmed;
                }
                const parsed = new URL(u);
                if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                    return parsed.toString();
                }
                return null;
            } catch { return null; }
        }

        function isValidWebUrl(url) {
            return normalizeWebUrl(url) !== null;
        }


        function matchMember(query) {
            if (!query || !members.length) return null;
            const q = query.trim().toLowerCase();
            return members.find(m => 
                (m.uri && m.uri.toLowerCase() === q) || 
                (m.url && m.url.toLowerCase() === q) ||
                (m.url && m.url.toLowerCase().replace(/\\/+$/, "") === q.replace(/\\/+$/, ""))
            ) || null;
        }

        function loadSession() {
            try {
                const raw = localStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.ringUri === ringUri && Array.isArray(parsed.history)) {
                        return parsed;
                    }
                }
            } catch (e) {}
            return null;
        }

        function saveSession(session) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(session));
                localStorage.setItem(LAST_RING_KEY, ringUri);
                if (channel) {
                    channel.postMessage({ type: "STATE_CHANGE", session: session });
                }
            } catch (e) {}
        }

        function initSession() {
            let currentUri = null;
            const matched = matchMember(initialMemberUri);
            if (matched) {
                currentUri = matched.uri;
            } else if (members.length > 0) {
                currentUri = members[0].uri;
            }
            const now = new Date().toISOString();
            const session = {
                ringUri: ringUri,
                currentMemberUri: currentUri,
                history: currentUri ? [currentUri] : [],
                historyIndex: currentUri ? 0 : -1,
                createdAt: now,
                updatedAt: now
            };
            saveSession(session);
            return session;
        }

        let session = loadSession() || initSession();
        let autoOpen = false;
        try {
            autoOpen = localStorage.getItem("atcircle_auto_open") === "true";
        } catch(e) {}

        const elTitle = document.getElementById("member-title");
        const elDesc = document.getElementById("member-desc");
        const elUrl = document.getElementById("member-url");
        const elUrlLink = document.getElementById("member-url-link");
        const elRssBadge = document.getElementById("member-rss-badge");
        const elRssLink = document.getElementById("member-rss-link");
        const elInvalidUrl = document.getElementById("invalid-url-alert");
        const elNoMembers = document.getElementById("no-members-alert");
        const elUnavailable = document.getElementById("member-unavailable-alert");
        const elMemberCard = document.getElementById("member-card");
        const elHistoryCount = document.getElementById("history-count");
        const elBtnPrev = document.getElementById("btn-prev");
        const elBtnNext = document.getElementById("btn-next");
        const elBtnRandom = document.getElementById("btn-random");
        const elBtnVisit = document.getElementById("btn-visit");
        const elAutoOpenCheckbox = document.getElementById("chk-auto-open");
        const elResumeBanner = document.getElementById("resume-banner");
        const elResumeSiteName = document.getElementById("resume-site-name");

        if (elAutoOpenCheckbox) {
            elAutoOpenCheckbox.checked = autoOpen;
            elAutoOpenCheckbox.addEventListener("change", function(e) {
                autoOpen = e.target.checked;
                try { localStorage.setItem("atcircle_auto_open", autoOpen ? "true" : "false"); } catch(e) {}
            });
        }

        function getCurrentMember() {
            if (!members.length) return null;
            if (session && session.currentMemberUri) {
                const found = members.find(m => m.uri === session.currentMemberUri);
                if (found) return found;
            }
            if (members.length > 0) {
                session.currentMemberUri = members[0].uri;
                if (!session.history || session.history.length === 0) {
                    session.history = [members[0].uri];
                    session.historyIndex = 0;
                }
                saveSession(session);
                return members[0];
            }
            return null;
        }


        function openCurrentSite() {
            const current = getCurrentMember();
            if (!current) return;
            const targetUrl = normalizeWebUrl(current.url);
            if (!targetUrl) return;
            window.open(targetUrl, "atcircle-visit", "noopener,noreferrer");
        }


        function updateUI() {
            if (members.length === 0) {
                if (elMemberCard) elMemberCard.classList.add("hidden");
                if (elNoMembers) elNoMembers.classList.remove("hidden");
                return;
            }
            if (elNoMembers) elNoMembers.classList.add("hidden");

            const current = getCurrentMember();
            if (!current) {
                if (elMemberCard) elMemberCard.classList.add("hidden");
                if (elUnavailable) elUnavailable.classList.remove("hidden");
                return;
            }

            if (elUnavailable) elUnavailable.classList.add("hidden");
            if (elMemberCard) elMemberCard.classList.remove("hidden");

            if (elTitle) elTitle.textContent = current.title || "Untitled Site";
            if (elDesc) elDesc.textContent = current.description || "";
            if (elUrl) elUrl.textContent = current.url || "";
            if (elUrlLink) elUrlLink.href = current.url || "#";

            const isValid = isValidWebUrl(current.url);
            if (elInvalidUrl) {
                if (isValid) elInvalidUrl.classList.add("hidden");
                else elInvalidUrl.classList.remove("hidden");
            }

            if (elRssBadge && elRssLink) {
                if (current.rssUrl && isValidWebUrl(current.rssUrl)) {
                    elRssLink.href = current.rssUrl;
                    elRssBadge.classList.remove("hidden");
                } else {
                    elRssBadge.classList.add("hidden");
                }
            }

            if (elBtnPrev) {
                elBtnPrev.disabled = session.historyIndex <= 0;
            }

            if (elHistoryCount) {
                const total = members.length;
                const idx = members.findIndex(m => m.uri === session.currentMemberUri);
                elHistoryCount.textContent = (idx >= 0 ? (idx + 1) : "-") + " / " + total;
            }
        }

        function navigateNext() {
            if (members.length === 0) return;
            const currentIndex = members.findIndex(m => m.uri === session.currentMemberUri);
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % members.length;
            advanceTo(members[nextIndex].uri);
        }

        function navigatePrev() {
            if (session.history.length === 0 || session.historyIndex <= 0) return;
            session.historyIndex -= 1;
            session.currentMemberUri = session.history[session.historyIndex];
            session.updatedAt = new Date().toISOString();
            saveSession(session);
            updateUI();
            if (autoOpen) openCurrentSite();
        }

        function navigateRandom() {
            if (members.length === 0) return;
            if (members.length === 1) {
                advanceTo(members[0].uri);
                return;
            }
            const pool = members.filter(m => m.uri !== session.currentMemberUri);
            const candidates = pool.length > 0 ? pool : members;
            const randomIndex = Math.floor(Math.random() * candidates.length);
            advanceTo(candidates[randomIndex].uri);
        }

        function advanceTo(memberUri) {
            const currentHistory = session.history.slice(0, session.historyIndex + 1);
            currentHistory.push(memberUri);
            session.history = currentHistory;
            session.historyIndex = currentHistory.length - 1;
            session.currentMemberUri = memberUri;
            session.updatedAt = new Date().toISOString();
            saveSession(session);
            updateUI();
            if (autoOpen) openCurrentSite();
        }

        if (elBtnNext) elBtnNext.addEventListener("click", navigateNext);
        if (elBtnPrev) elBtnPrev.addEventListener("click", navigatePrev);
        if (elBtnRandom) elBtnRandom.addEventListener("click", navigateRandom);
        if (elBtnVisit) elBtnVisit.addEventListener("click", openCurrentSite);

        // Resume & Reset Handlers
        const btnResume = document.getElementById("btn-resume-session");
        const btnStartOver = document.getElementById("btn-start-over");
        const btnClearSession = document.getElementById("btn-clear-session");

        if (btnResume && elResumeBanner) {
            btnResume.addEventListener("click", function() {
                elResumeBanner.classList.add("hidden");
                updateUI();
            });
        }
        if (btnStartOver) {
            btnStartOver.addEventListener("click", function() {
                if (elResumeBanner) elResumeBanner.classList.add("hidden");
                session = initSession();
                updateUI();
            });
        }
        if (btnClearSession) {
            btnClearSession.addEventListener("click", function() {
                try {
                    localStorage.removeItem(storageKey);
                } catch(e) {}
                session = initSession();
                updateUI();
                alert(${JSON.stringify("巡回履歴をクリアしました。")});
            });
        }

        // Cross-window sync via BroadcastChannel and storage event
        if (channel) {
            channel.onmessage = function(ev) {
                if (ev.data && ev.data.type === "STATE_CHANGE" && ev.data.session) {
                    session = ev.data.session;
                    updateUI();
                }
            };
        }

        window.addEventListener("storage", function(e) {
            if (e.key === storageKey && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && parsed.ringUri === ringUri) {
                        session = parsed;
                        updateUI();
                    }
                } catch(err) {}
            }
        });

        // Keyboard Shortcuts
        window.addEventListener("keydown", function(e) {
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
                return;
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                navigatePrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                navigateNext();
            } else if (e.key === "r" || e.key === "R") {
                e.preventDefault();
                navigateRandom();
            } else if (e.key === "Enter" || e.key === "o" || e.key === "O") {
                e.preventDefault();
                openCurrentSite();
            }
        });

        updateUI();
    })();
    `;
}

/**
 * Companion View rendered as a standalone, compact HTML UI.
 */
export const CompanionView = ({
    ring,
    members,
    initialMemberUri,
    lang = "ja",
    t,
}: CompanionViewProps) => {
    const title = `${ring.title} - Companion`;
    const ringPageUrl = ring.slug
        ? `/r/${ring.slug}`
        : `/rings/view?ring=${encodeURIComponent(ring.uri)}`;

    return html`
    <!DOCTYPE html>
    <html lang="${lang}" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>${title}</title>
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" type="image/png" href="/assets/favicon.png">
        <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" type="text/css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
        <link href="/assets/index.css" rel="stylesheet" />
        <style>
            .hidden, [hidden] {
                display: none !important;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0.75rem;
                min-width: 300px;
                user-select: none;
            }
            .site-description {
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        </style>

    </head>
    <body class="bg-base-200 min-h-screen flex flex-col justify-between">
        <div class="w-full max-w-md mx-auto space-y-3">
            <!-- Top Header -->
            <div class="flex items-center justify-between bg-base-100 px-3 py-2 rounded-xl shadow-sm">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full bg-success animate-pulse shrink-0" title="${t("companion.synced")}"></span>
                    <a href="/" target="_blank" class="text-xs font-black italic tracking-tighter text-primary shrink-0 hover:underline">AT CIRCLE</a>
                    <span class="text-xs opacity-40">/</span>
                    <a href="${ringPageUrl}" target="_blank" class="text-xs font-bold truncate hover:underline" title="${ring.title}">${ring.title}</a>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <span id="history-count" class="badge badge-sm badge-ghost text-[10px] font-mono">1 / ${members.length}</span>
                    <a href="${ringPageUrl}" target="_blank" class="btn btn-ghost btn-xs btn-square" title="${t("companion.back_to_ring")}" aria-label="${t("companion.back_to_ring")}">
                        <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    </a>
                </div>
            </div>

            <!-- Member Card -->
            <div id="member-card" class="card bg-base-100 shadow-md border border-base-300">
                <div class="card-body p-4">
                    <div class="flex items-start justify-between gap-2">
                        <h2 id="member-title" class="card-title text-base leading-tight font-bold text-base-content break-words">
                            Loading...
                        </h2>
                        <span id="member-rss-badge" class="hidden shrink-0">
                            <a id="member-rss-link" href="#" target="_blank" class="badge badge-warning badge-xs font-mono font-bold">RSS</a>
                        </span>
                    </div>
                    
                    <p id="member-desc" class="text-xs text-base-content/70 site-description mt-1 min-h-[2.5rem]">
                        -
                    </p>

                    <div class="text-[11px] opacity-60 truncate mt-1">
                        <a id="member-url-link" href="#" target="_blank" rel="noopener noreferrer" class="link link-hover flex items-center gap-1 font-mono">
                            <i class="fa-solid fa-link text-[10px]"></i>
                            <span id="member-url" class="truncate">https://...</span>
                        </a>
                    </div>

                    <div id="invalid-url-alert" class="alert alert-error text-xs p-2 mt-2 hidden">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>${t("companion.invalid_url")}</span>
                    </div>

                    <!-- Visit Site Button -->
                    <button id="btn-visit" class="btn btn-primary btn-sm w-full mt-3 shadow-sm font-semibold flex items-center justify-center gap-2" aria-label="${t("companion.visit_site")}">
                        <span>${t("companion.visit_site")}</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Error Alerts -->
            <div id="no-members-alert" class="alert alert-warning text-xs p-3 hidden">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>${t("companion.no_members")}</span>
            </div>

            <div id="member-unavailable-alert" class="alert alert-error text-xs p-3 hidden">
                <i class="fa-solid fa-ban"></i>
                <span>${t("companion.member_unavailable")}</span>
            </div>

            <!-- Navigation Controls -->
            <div class="grid grid-cols-3 gap-2">
                <button id="btn-prev" class="btn btn-outline btn-sm font-medium" aria-label="${t("companion.prev")}">
                    <i class="fa-solid fa-chevron-left mr-1"></i>
                    ${t("companion.prev")}
                </button>
                <button id="btn-random" class="btn btn-outline btn-sm font-medium" aria-label="${t("companion.random")}">
                    <i class="fa-solid fa-shuffle mr-1"></i>
                    ${t("companion.random")}
                </button>
                <button id="btn-next" class="btn btn-primary btn-sm font-bold" aria-label="${t("companion.next")}">
                    ${t("companion.next")}
                    <i class="fa-solid fa-chevron-right ml-1"></i>
                </button>
            </div>

            <!-- Auto Open & Session Options -->
            <div class="bg-base-100 rounded-xl p-3 shadow-sm text-xs space-y-2 border border-base-200">
                <label class="label cursor-pointer p-0 justify-between">
                    <span class="label-text text-xs opacity-80">${t("companion.auto_open")}</span>
                    <input id="chk-auto-open" type="checkbox" class="toggle toggle-primary toggle-xs" />
                </label>

                <div class="divider my-1"></div>

                <div class="flex items-center justify-between text-[11px] text-base-content/60">
                    <button id="btn-start-over" class="btn btn-ghost btn-xs text-[11px] px-1">${t("companion.start_over")}</button>
                    <button id="btn-clear-session" class="btn btn-ghost btn-xs text-error text-[11px] px-1">${t("companion.clear_session")}</button>
                </div>
            </div>

            <!-- Keyboard shortcuts footer hint -->
            <div class="text-center text-[10px] text-base-content/40 select-none pb-1">
                ${t("companion.shortcuts_hint")}
            </div>
        </div>

        <script>
            ${raw(generateCompanionScript(ring.uri, members, initialMemberUri || null))}
        </script>

        <script>
            // Register PWA Service Worker
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
            }
        </script>
    </body>
    </html>
    `;
};
