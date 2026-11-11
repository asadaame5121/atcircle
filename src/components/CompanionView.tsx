import { html, raw } from "hono/html";
import { jsonForScript } from "../lib/html.js";
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
        const ringUri = ${jsonForScript(ringUri)};
        let members = ${jsonForScript(initialMembers)};
        const initialMemberUri = ${jsonForScript(initialMemberUri)};
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
    <html lang="${lang}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" type="image/png" href="/assets/favicon.png">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Kosugi+Maru&display=swap" rel="stylesheet">
        <link href="/assets/index.css" rel="stylesheet" />
    </head>
    <body class="rt-body rt-companion">
        <div class="rt-frame">
            <header class="rt-companion-head">
                <a href="/" target="_blank" rel="noopener" class="rt-logo">AT CIRCLE</a>
                <span class="rt-companion-sep" aria-hidden="true">≫</span>
                <a href="${ringPageUrl}" target="_blank" rel="noopener" class="rt-companion-ring" title="${t("companion.back_to_ring")}">${ring.title}</a>
                <span id="history-count" class="rt-companion-count" title="${t("companion.synced")}">1 / ${members.length}</span>
            </header>

            <main class="rt-companion-main">
                <section id="member-card" class="rt-panel" aria-live="polite">
                    <p class="rt-tour-title">
                        <b id="member-title">Loading...</b>
                        <span id="member-rss-badge" class="hidden"><a id="member-rss-link" href="#" target="_blank" rel="noopener noreferrer" class="rt-tag rt-tag-manual">RSS</a></span>
                    </p>
                    <p id="member-desc" class="rt-dash-ring-desc rt-companion-desc">-</p>
                    <p class="rt-tour-url"><a id="member-url-link" href="#" target="_blank" rel="noopener noreferrer"><span id="member-url">https://...</span></a></p>
                    <p id="invalid-url-alert" class="rt-error hidden" role="alert">${t("companion.invalid_url")}</p>
                    <button type="button" id="btn-visit" class="rt-bevel rt-go rt-block" aria-label="${t("companion.visit_site")}">${t("companion.visit_site")} ≫</button>
                </section>

                <p id="no-members-alert" class="rt-error hidden" role="alert">${t("companion.no_members")}</p>
                <p id="member-unavailable-alert" class="rt-error hidden" role="alert">${t("companion.member_unavailable")}</p>

                <nav class="rt-tour-nav rt-companion-nav" aria-label="${t("companion.prev")} / ${t("companion.next")}">
                    <button type="button" id="btn-prev" class="rt-bevel" aria-label="${t("companion.prev")}">≪ ${t("companion.prev")}</button>
                    <button type="button" id="btn-random" class="rt-bevel" aria-label="${t("companion.random")}">${t("companion.random")}</button>
                    <button type="button" id="btn-next" class="rt-bevel rt-go" aria-label="${t("companion.next")}">${t("companion.next")} ≫</button>
                </nav>

                <div class="rt-box rt-companion-options">
                    <label class="rt-check-label rt-companion-option">
                        <input id="chk-auto-open" type="checkbox" />
                        ${t("companion.auto_open")}
                    </label>
                    <p class="rt-companion-links">
                        <button type="button" id="btn-start-over" class="rt-link-btn">${t("companion.start_over")}</button>
                        ｜
                        <button type="button" id="btn-clear-session" class="rt-link-btn rt-danger">${t("companion.clear_session")}</button>
                    </p>
                </div>

                <p class="rt-note rt-center">${t("companion.shortcuts_hint")}</p>
            </main>
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
