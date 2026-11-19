import { html, raw } from "hono/html";
import { jsonForScript, safeHref } from "../lib/html.js";
import {
    type NavigationMember,
    toNavigationMembers,
} from "../lib/navigation-session.js";

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
        const ringUri = ${jsonForScript(ringUri)};
        const members = ${jsonForScript(navMembers)};
        const initialMemberUri = ${jsonForScript(initialMemberUri)};
        const storageKey = "atcircle_session_" + encodeURIComponent(ringUri);
        const channelName = "atcircle_nav_" + encodeURIComponent(ringUri);

        let channel = null;
        try {
            if (typeof BroadcastChannel !== "undefined") {
                channel = new BroadcastChannel(channelName);
            }
        } catch(e) {}

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
            if (!current) return;
            const targetUrl = normalizeWebUrl(current.url);
            if (!targetUrl) return;
            window.open(targetUrl, "atcircle-visit", "noopener,noreferrer");
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
    const navMembers: NavigationMember[] = toNavigationMembers(members || []);

    return html`
        <p class="rt-crumbs"><a href="/rings">${t("find.title")}</a> ≫ ${ring.title}</p>
        ${
            ring.banner_url
                ? html`<p class="rt-center"><img src="${safeHref(ring.banner_url, "")}" alt="${ring.title}" class="rt-ring-banner" /></p>`
                : ""
        }
        <h1 class="rt-h1">★ ${ring.title} ★</h1>
        <p class="rt-lead">${ring.description || t("common.no_description")}</p>
        <div class="rt-actions">
            <a href="/rings?select=${encodeURIComponent(ringUri)}#join" class="rt-bevel rt-go">${t("rings.join_this_ring")}</a>
            <a href="/antenna?ring=${encodeURIComponent(ringUri)}" class="rt-bevel">${t("common.antenna")}</a>
            <a href="/rings/opml?ring=${encodeURIComponent(ringUri)}" class="rt-bevel">OPML</a>
        </div>

        ${
            navMembers.length > 0
                ? html`
            <section id="main-tour-card" class="rt-box rt-tour" aria-labelledby="tour-heading">
                <h2 id="tour-heading" class="rt-box-title">${t("rings.current_member")}</h2>
                <div class="rt-tour-body">
                    <p class="rt-tour-title">
                        <b id="tour-member-title">Loading...</b>
                        <a id="tour-member-rss" href="#" target="_blank" rel="noopener noreferrer" class="rt-tag rt-tag-manual hidden">RSS</a>
                    </p>
                    <p id="tour-member-desc" class="rt-dash-ring-desc">-</p>
                    <p class="rt-tour-url"><a id="tour-member-url" href="#" target="_blank" rel="noopener noreferrer">https://...</a></p>
                    <div class="rt-tour-nav">
                        <a href="/nav/prev?ring=${encodeURIComponent(ringUri)}" id="tour-btn-prev" class="rt-bevel" aria-label="${t("rings.prev_member")}">≪ ${t("rings.prev_member")}</a>
                        <a href="/nav/random?ring=${encodeURIComponent(ringUri)}" id="tour-btn-random" class="rt-bevel" aria-label="${t("rings.random_member")}">${t("rings.random_member")}</a>
                        <a href="/nav/next?ring=${encodeURIComponent(ringUri)}" id="tour-btn-next" class="rt-bevel" aria-label="${t("rings.next_member")}">${t("rings.next_member")} ≫</a>
                    </div>
                    <button type="button" id="tour-btn-visit" class="rt-bevel rt-go rt-block">${t("rings.visit_site")}</button>
                    <p class="rt-tour-companion">
                        <button type="button" id="btn-open-companion-win" class="rt-link-btn">${t("rings.open_companion_window")}</button>
                        ｜ <a href="${companionUrl}" target="_blank" rel="noopener">${t("rings.open_companion_tab")}</a>
                    </p>
                </div>
            </section>
        `
                : ""
        }

        <section class="rt-box" aria-labelledby="members-heading">
            <h2 id="members-heading" class="rt-box-title">${t("rings.members_count_label", { count: members?.length || 0 })}</h2>
            ${
                members && members.length > 0
                    ? html`<ul class="rt-ring-list">
                ${members.map(
                    (site, i) => html`
                    <li class="rt-ring-row${i === 0 ? " rt-ring-row-first" : ""}">
                        <span class="rt-ring-head">
                            <span class="rt-mark" aria-hidden="true">◆</span>
                            <a href="${safeHref(site.url)}" target="_blank" rel="noopener noreferrer" class="rt-ring-name">${site.title}</a>
                            <span class="rt-ring-meta">${displayUrl(site.url)}</span>
                            ${site.rss_url ? html`<a href="${safeHref(site.rss_url)}" target="_blank" rel="noopener noreferrer" class="rt-tag rt-tag-manual">RSS</a>` : ""}
                        </span>
                        ${site.description ? html`<span class="rt-ring-desc">${site.description}</span>` : ""}
                    </li>
                `,
                )}
            </ul>`
                    : html`<p class="rt-empty">${t("rings.no_members_found")}</p>`
            }
        </section>
        <p class="rt-right"><a href="/rings">${t("common.back_to_list")}</a></p>
        ${
            navMembers.length > 0
                ? html`<script>${raw(generateRingTourScript(ringUri, navMembers, initialMemberUri || null))}</script>`
                : ""
        }
    `;
};
