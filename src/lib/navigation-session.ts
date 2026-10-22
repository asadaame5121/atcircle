/**
 * Navigation Session & Utilities for atcircle Companion Navigation
 *
 * Implements persistent webring session state, history tracking,
 * URL sanitization, and navigation semantics.
 */

export interface NavigationMember {
    uri: string; // AT URI
    url: string; // Canonical HTTP(S) URL
    title: string;
    description: string | null;
    rssUrl?: string | null;
}

export interface NavigationSession {
    ringUri: string;
    currentMemberUri: string | null;
    history: string[]; // member URI history
    historyIndex: number;
    updatedAt: string; // ISO 8601
    createdAt?: string;
}

/**
 * Normalizes an external URL, prepending https:// if missing,
 * while strictly rejecting unsafe schemes (javascript:, data:, vbscript:, ftp:, file:, etc.).
 */
export function normalizeWebUrl(urlString?: string | null): string | null {
    if (!urlString || typeof urlString !== "string") return null;
    const trimmed = urlString.trim();
    if (!trimmed) return null;

    // If it contains a scheme (e.g. ftp:, javascript:, custom:), it must be http: or https:
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
        if (!/^https?:\/\//i.test(trimmed)) {
            return null;
        }
    }

    try {
        let urlWithScheme = trimmed;
        if (!/^https?:\/\//i.test(trimmed)) {
            // Must have a valid hostname structure (e.g. example.com or localhost)
            if (!trimmed.includes(".") && !trimmed.startsWith("localhost")) {
                return null;
            }
            urlWithScheme = `https://${trimmed}`;
        }
        const parsed = new URL(urlWithScheme);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            if (parsed.hostname && parsed.hostname.length > 0) {
                return parsed.toString();
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Validates whether a URL is a safe, valid web URL (http or https).
 * Accepts domain strings and prepends https:// for validation.
 * Rejects javascript:, data:, file:, etc.
 */
export function isValidWebUrl(urlString?: string | null): boolean {
    return normalizeWebUrl(urlString) !== null;
}

/**
 * Sanitizes an external URL, returning normalized valid URL or null if invalid.
 */
export function sanitizeExternalUrl(urlString?: string | null): string | null {
    return normalizeWebUrl(urlString);
}

const STORAGE_PREFIX = "atcircle_session_";
const LAST_RING_KEY = "atcircle_last_session_ring";

export class NavigationSessionManager {
    private storage: Storage | null;

    constructor(storage?: Storage) {
        if (storage) {
            this.storage = storage;
        } else if (typeof window !== "undefined" && window.localStorage) {
            this.storage = window.localStorage;
        } else {
            this.storage = null;
        }
    }

    private getStorageKey(ringUri: string): string {
        return `${STORAGE_PREFIX}${encodeURIComponent(ringUri)}`;
    }

    /**
     * Loads a navigation session from storage.
     */
    loadSession(ringUri: string): NavigationSession | null {
        if (!this.storage) return null;
        try {
            const raw = this.storage.getItem(this.getStorageKey(ringUri));
            if (!raw) return null;
            const parsed = JSON.parse(raw) as NavigationSession;
            if (
                parsed &&
                parsed.ringUri === ringUri &&
                Array.isArray(parsed.history)
            ) {
                return parsed;
            }
        } catch {
            // Ignore corrupted json
        }
        return null;
    }

    /**
     * Saves a navigation session to storage.
     */
    saveSession(session: NavigationSession): void {
        if (!this.storage) return;
        try {
            this.storage.setItem(
                this.getStorageKey(session.ringUri),
                JSON.stringify(session),
            );
            this.storage.setItem(LAST_RING_KEY, session.ringUri);
        } catch {
            // Storage quota exceeded or disabled
        }
    }

    /**
     * Clears a navigation session from storage.
     */
    clearSession(ringUri: string): void {
        if (!this.storage) return;
        try {
            this.storage.removeItem(this.getStorageKey(ringUri));
            const lastRing = this.storage.getItem(LAST_RING_KEY);
            if (lastRing === ringUri) {
                this.storage.removeItem(LAST_RING_KEY);
            }
        } catch {
            // Ignore
        }
    }

    /**
     * Gets the last visited ring URI if available.
     */
    getLastVisitedRingUri(): string | null {
        if (!this.storage) return null;
        try {
            return this.storage.getItem(LAST_RING_KEY);
        } catch {
            return null;
        }
    }

    /**
     * Initializes a new session or resets current position.
     */
    initSession(
        ringUri: string,
        members: NavigationMember[],
        initialMemberUri?: string | null,
    ): NavigationSession {
        let currentUri: string | null = null;

        if (
            initialMemberUri &&
            members.some((m) => m.uri === initialMemberUri)
        ) {
            currentUri = initialMemberUri;
        } else if (members.length > 0) {
            currentUri = members[0].uri;
        }

        const now = new Date().toISOString();
        const session: NavigationSession = {
            ringUri,
            currentMemberUri: currentUri,
            history: currentUri ? [currentUri] : [],
            historyIndex: currentUri ? 0 : -1,
            createdAt: now,
            updatedAt: now,
        };

        this.saveSession(session);
        return session;
    }

    /**
     * Moves to the next member in the ring's sequential order.
     * Loops back to the start if at the end.
     */
    next(
        session: NavigationSession,
        members: NavigationMember[],
    ): NavigationSession {
        if (members.length === 0) return session;

        const currentIndex = members.findIndex(
            (m) => m.uri === session.currentMemberUri,
        );
        const nextIndex =
            currentIndex === -1 ? 0 : (currentIndex + 1) % members.length;
        const nextMember = members[nextIndex];

        return this.advanceToMember(session, nextMember.uri);
    }

    /**
     * Moves to the previous member in navigation history.
     */
    prev(session: NavigationSession): NavigationSession {
        if (session.history.length === 0 || session.historyIndex <= 0) {
            return session;
        }

        const newIndex = session.historyIndex - 1;
        const targetMemberUri = session.history[newIndex];

        const updated: NavigationSession = {
            ...session,
            currentMemberUri: targetMemberUri,
            historyIndex: newIndex,
            updatedAt: new Date().toISOString(),
        };

        this.saveSession(updated);
        return updated;
    }

    /**
     * Selects a random member from the ring (excluding current member if possible).
     */
    random(
        session: NavigationSession,
        members: NavigationMember[],
    ): NavigationSession {
        if (members.length === 0) return session;
        if (members.length === 1) {
            return this.advanceToMember(session, members[0].uri);
        }

        const candidates = members.filter(
            (m) => m.uri !== session.currentMemberUri,
        );
        const pool = candidates.length > 0 ? candidates : members;
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selected = pool[randomIndex];

        return this.advanceToMember(session, selected.uri);
    }

    /**
     * Manually selects a member by URI.
     */
    selectMember(
        session: NavigationSession,
        memberUri: string,
    ): NavigationSession {
        return this.advanceToMember(session, memberUri);
    }

    /**
     * Helper to advance session history to a target member URI.
     */
    private advanceToMember(
        session: NavigationSession,
        memberUri: string,
    ): NavigationSession {
        // Slice history up to current index (dropping any redo history)
        const currentHistory = session.history.slice(
            0,
            session.historyIndex + 1,
        );
        const newHistory = [...currentHistory, memberUri];
        const newIndex = newHistory.length - 1;

        const updated: NavigationSession = {
            ...session,
            currentMemberUri: memberUri,
            history: newHistory,
            historyIndex: newIndex,
            updatedAt: new Date().toISOString(),
        };

        this.saveSession(updated);
        return updated;
    }

    /**
     * Resolves the current NavigationMember from session and member list.
     */
    getCurrentMember(
        session: NavigationSession,
        members: NavigationMember[],
    ): NavigationMember | null {
        if (!session.currentMemberUri) return null;
        return members.find((m) => m.uri === session.currentMemberUri) || null;
    }

    /**
     * Opens a site URL safely in the target window/tab.
     */
    openSite(url: string, targetName = "atcircle-visit"): Window | null {
        const sanitized = sanitizeExternalUrl(url);
        if (!sanitized || typeof window === "undefined") return null;
        return window.open(sanitized, targetName, "noopener,noreferrer");
    }
}
