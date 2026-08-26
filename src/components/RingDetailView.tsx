import { html, raw } from "hono/html";
import type { NavigationMember } from "../lib/navigation-session.js";

interface RingDetailViewProps {
    ring: any;
    members: any[];
    ringUri: string;
    initialMemberUri?: string | null;
    t: (key: string, options?: any) => string;
}

const displayUrl = (url: string) => {
    try {
        const u = new URL(url);
        return `${u.hostname}${u.pathname === "/" ? "" : u.pathname}`;
    } catch {
        return url;
    }
};

/**
 * Client script for the Ring Detail Tour & Sync
 */
function generateRingTourScript(
    ringUri: string,
    navMembers: NavigationMember[],
    initialMemberUri: string | null,
): string {
    return `
    (function() {
        const ringUri = ${JSON.stringify(ringUri)};
        const members = ${JSON.stringify(navMembers)};
        const initialMemberUri = ${JSON.stringify(initialMemberUri)};
        const storageKey = "atcircle_session_" + encodeURIComponent(ringUri);
        const channelName = "atcircle_nav_" + encodeURIComponent(ringUri);

        let channel = null;
        try {
            if (typeof BroadcastChannel !== "undefined") {
                channel = new BroadcastChannel(channelName);
            }
        } catch(e) {}

        function isValidWebUrl(url) {
            if (!url || typeof url !== "string") return false;
            try {
                const parsed = new URL(url.trim());
                return parsed.protocol === "http:" || parsed.protocol === "https:";
            } catch { return false; }
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
                    if (parsed && parsed.ringUri === ringUri && Array.isArray(parsed.history)) return parsed;
                }
            } catch(e) {}
            return null;
        }

        function saveSession(session) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(session));
                localStorage.setItem("atcircle_last_session_ring", ringUri);
                if (channel) {
                    channel.postMessage({ type: "STATE_CHANGE", session: session });
                }
            } catch(e) {}
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

        const elCard = document.getElementById("main-tour-card");
        const elTitle = document.getElementById("tour-member-title");
        const elDesc = document.getElementById("tour-member-desc");
        const elUrl = document.getElementById("tour-member-url");
        const elRssBadge = document.getElementById("tour-member-rss");
        const elBtnPrev = document.getElementById("tour-btn-prev");
        const elBtnNext = document.getElementById("tour-btn-next");
        const elBtnRandom = document.getElementById("tour-btn-random");
        const elBtnVisit = document.getElementById("tour-btn-visit");
        const elBtnOpenWindow = document.getElementById("btn-open-companion-win");

        function getCurrentMember() {
            if (!members.length) return null;
            if (session && session.currentMemberUri) {
                const found = members.find(m => m.uri === session.currentMemberUri);
                if (found) return found;
            }
            // Fallback to first member and auto-repair session
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
            if (!current || !isValidWebUrl(current.url)) return;
            window.open(current.url, "atcircle-visit", "noopener,noreferrer");
        }

        function updateUI() {
            if (members.length === 0) {
                if (elCard) elCard.classList.add("hidden");
                return;
            }
            const current = getCurrentMember();
            if (!current) return;

            if (elTitle) elTitle.textContent = current.title || "Untitled Site";
            if (elDesc) elDesc.textContent = current.description || "-";
            if (elUrl) {
                elUrl.textContent = current.url;
                elUrl.href = current.url;
            }
            if (elRssBadge) {
                if (current.rssUrl && isValidWebUrl(current.rssUrl)) {
                    elRssBadge.href = current.rssUrl;
                    elRssBadge.classList.remove("hidden");
                } else {
                    elRssBadge.classList.add("hidden");
                }
            }
            if (elBtnPrev) {
                elBtnPrev.disabled = session.historyIndex <= 0;
            }
        }

        function advanceTo(memberUri, andOpen) {
            const hist = session.history.slice(0, session.historyIndex + 1);
            hist.push(memberUri);
            session.history = hist;
            session.historyIndex = hist.length - 1;
            session.currentMemberUri = memberUri;
            session.updatedAt = new Date().toISOString();
            saveSession(session);
            updateUI();
            if (andOpen) {
                openCurrentSite();
            }
        }

        if (elBtnNext) {
            elBtnNext.addEventListener("click", function(e) {
                e.preventDefault();
                if (members.length === 0) return;
                const curIdx = members.findIndex(m => m.uri === session.currentMemberUri);
                const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % members.length;
                advanceTo(members[nextIdx].uri, true);
            });
        }

        if (elBtnPrev) {
            elBtnPrev.addEventListener("click", function(e) {
                e.preventDefault();
                if (session.history.length === 0 || session.historyIndex <= 0) return;
                session.historyIndex -= 1;
                session.currentMemberUri = session.history[session.historyIndex];
                session.updatedAt = new Date().toISOString();
                saveSession(session);
                updateUI();
                openCurrentSite();
            });
        }

        if (elBtnRandom) {
            elBtnRandom.addEventListener("click", function(e) {
                e.preventDefault();
                if (members.length === 0) return;
                const pool = members.filter(m => m.uri !== session.currentMemberUri);
                const cands = pool.length > 0 ? pool : members;
                const rnd = Math.floor(Math.random() * cands.length);
                advanceTo(cands[rnd].uri, true);
            });
        }

        if (elBtnVisit) elBtnVisit.addEventListener("click", function(e) {
            e.preventDefault();
            openCurrentSite();
        });

        if (elBtnOpenWindow) {
            elBtnOpenWindow.addEventListener("click", function() {
                const companionUrl = "/rings/companion?ring=" + encodeURIComponent(ringUri);
                const win = window.open(
                    companionUrl,
                    "atcircle_companion_" + encodeURIComponent(ringUri),
                    "width=420,height=560,resizable=yes,scrollbars=yes"
                );
                if (win) win.focus();
            });
        }

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

        // Keyboard shortcuts
        window.addEventListener("keydown", function(e) {
            const active = document.activeElement;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
            if (e.key === "ArrowLeft") { e.preventDefault(); elBtnPrev?.click(); }
            else if (e.key === "ArrowRight") { e.preventDefault(); elBtnNext?.click(); }
            else if (e.key === "r" || e.key === "R") { e.preventDefault(); elBtnRandom?.click(); }
            else if (e.key === "Enter" || e.key === "o" || e.key === "O") { e.preventDefault(); openCurrentSite(); }
        });

        updateUI();
    })();
    `;
}

export const RingDetailView = ({
    ring,
    members,
    ringUri,
    initialMemberUri,
    t,
}: RingDetailViewProps) => {
    const companionUrl = `/rings/companion?ring=${encodeURIComponent(ringUri)}`;
    const navMembers: NavigationMember[] = (members || []).map((m) => ({
        uri: m.member_uri || `member-${m.id}`,
        url: m.url,
        title: m.title,
        description: m.description,
        rssUrl: m.rss_url,
    }));

    return html`
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body p-4 sm:p-8">
                <div class="text-sm breadcrumbs mb-4">
                    <ul>
                        <li><a href="/rings">${t("rings.explore_title")}</a></li>
                        <li>${ring.title}</li>
                    </ul>
                </div>

                <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                    <div class="flex-1">
                        ${
                            ring.banner_url
                                ? html`
                            <div class="mb-4 rounded-xl overflow-hidden shadow-sm aspect-3/1 max-h-[150px] w-full bg-base-200 border border-base-300">
                                <img src="${ring.banner_url}" alt="${ring.title}" class="w-full h-full object-contain" />
                            </div>
                        `
                                : ""
                        }
                        <h1 class="card-title text-3xl mb-2">${ring.title}</h1>
                        <p class="opacity-75">${ring.description || t("common.no_description")}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <a href="/antenna?ring=${encodeURIComponent(ringUri)}" class="btn btn-outline btn-sm"><i class="fa-solid fa-tower-broadcast mr-1"></i>Antenna</a>
                        <a href="/rings/opml?ring=${encodeURIComponent(ringUri)}" class="btn btn-outline btn-sm"><i class="fa-solid fa-file-export mr-1"></i>OPML</a>
                        <a href="${companionUrl}" target="_blank" class="btn btn-primary btn-sm">
                            <i class="fa-solid fa-compass mr-1"></i>
                            ${t("rings.open_companion")}
                        </a>
                    </div>
                </div>

                ${
                    navMembers.length > 0
                        ? html`
                    <!-- Touring Companion Panel -->
                    <div id="main-tour-card" class="bg-base-200/80 rounded-2xl p-5 border border-base-300 my-4 shadow-sm">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                            <div class="flex items-center gap-2">
                                <span class="badge badge-primary badge-sm font-bold">${t("rings.current_member")}</span>
                                <h3 id="tour-member-title" class="font-bold text-lg text-base-content truncate max-w-[240px] sm:max-w-md">Loading...</h3>
                                <a id="tour-member-rss" href="#" target="_blank" class="badge badge-warning badge-xs font-mono font-bold hidden">RSS</a>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="btn-open-companion-win" class="btn btn-xs btn-outline" title="${t("rings.open_companion_window")}">
                                    <i class="fa-solid fa-window-restore mr-1"></i>
                                    ${t("rings.open_companion_window")}
                                </button>
                                <a href="${companionUrl}" target="_blank" class="btn btn-xs btn-ghost" title="${t("rings.open_companion_tab")}">
                                    <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>
                                    ${t("rings.open_companion_tab")}
                                </a>
                            </div>
                        </div>

                        <p id="tour-member-desc" class="text-sm text-base-content/75 mb-3">-</p>

                        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-base-300/60">
                            <div class="flex items-center gap-2">
                                <button id="tour-btn-visit" class="btn btn-primary btn-sm font-semibold">
                                    ${t("rings.visit_site")}
                                </button>
                                <a id="tour-member-url" href="#" target="_blank" rel="noopener noreferrer" class="link link-hover text-xs font-mono opacity-60 truncate max-w-[180px] sm:max-w-xs">
                                    https://...
                                </a>
                            </div>

                            <div class="flex items-center gap-2 ml-auto">
                                <a href="/nav/prev?ring=${encodeURIComponent(ringUri)}" id="tour-btn-prev" class="btn btn-outline btn-sm" aria-label="${t("rings.prev_member")}">
                                    <i class="fa-solid fa-chevron-left mr-1"></i>
                                    ${t("rings.prev_member")}
                                </a>
                                <a href="/nav/random?ring=${encodeURIComponent(ringUri)}" id="tour-btn-random" class="btn btn-outline btn-sm" aria-label="${t("rings.random_member")}">
                                    <i class="fa-solid fa-shuffle mr-1"></i>
                                    ${t("rings.random_member")}
                                </a>
                                <a href="/nav/next?ring=${encodeURIComponent(ringUri)}" id="tour-btn-next" class="btn btn-outline btn-sm font-semibold" aria-label="${t("rings.next_member")}">
                                    ${t("rings.next_member")}
                                    <i class="fa-solid fa-chevron-right ml-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `
                        : ""
                }

                <div class="divider mt-6">${t("rings.members_count_label", { count: members?.length || 0 })}</div>

                ${
                    members && members.length > 0
                        ? html`
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${members.map(
                            (site) => html`
                            <div class="card bg-base-200 shadow-sm border border-base-300">
                                <div class="card-body p-5">
                                    <h3 class="font-bold break-all">${site.title}</h3>
                                    <p class="text-xs opacity-50 underline truncate" title="${site.url}">
                                        <a href="${site.url}" target="_blank" rel="noopener noreferrer">${displayUrl(site.url)}</a>
                                    </p>
                                    <p class="text-sm text-base-content/70 line-clamp-2">${site.description || "-"}</p>
                                    <div class="card-actions justify-end mt-2">
                                        ${site.rss_url ? html`<a href="${site.rss_url}" target="_blank" rel="noopener noreferrer" class="badge badge-warning badge-sm">RSS</a>` : ""}
                                        <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-ghost">${t("common.visit")}</a>
                                    </div>
                                </div>
                            </div>
                        `,
                        )}
                    </div>
                `
                        : html`<div class="alert alert-ghost border-dashed">${t("rings.no_members_found")}</div>`
                }

                <div class="card-actions justify-center mt-12 gap-4">
                    <a href="/dashboard?ring=${encodeURIComponent(ringUri)}" class="btn btn-primary btn-lg">${t("rings.join_this_ring")}</a>
                    <a href="/rings" class="btn btn-ghost">${t("common.back_to_list")}</a>
                </div>
            </div>
        </div>
        ${
            navMembers.length > 0
                ? html`<script>${raw(generateRingTourScript(ringUri, navMembers, initialMemberUri || null))}</script>`
                : ""
        }
    `;
};
