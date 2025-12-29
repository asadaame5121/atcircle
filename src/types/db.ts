export interface User {
    did: string;
    handle: string;
    created_at?: number;
}

export interface Site {
    id: number;
    user_did: string;
    url: string;
    title: string;
    description: string | null;
    rss_url: string | null;
    is_active: number;
    acceptance_policy: string;
    atproto_status: string;
    is_verified: number;
    created_at?: number;
}

export interface AntennaItem {
    id: number;
    site_id: number;
    title: string;
    url: string;
    published_at: number | null;
}

export interface OAuthState {
    key: string;
    state: string;
    created_at?: number;
}

export interface Ring {
    uri: string;
    owner_did: string;
    title: string;
    description: string | null;
    created_at?: number;
    // Calculated fields often used in SELECT
    member_count?: number;
    status?: string;
    acceptance_policy?: string;
}

export interface Membership {
    id: number;
    ring_uri: string;
    site_id: number;
    member_uri: string;
    status: "pending" | "approved" | "rejected";
    created_at?: number;
    // Joined fields
    site_title?: string;
    site_url?: string;
    ring_title?: string;
}

/**
 * Minimal interface for D1-like database, compatible with both Cloudflare D1 and our D1DatabaseCompat.
 */
/**
 * Minimal interface for D1-like statement, compatible with both Cloudflare D1 and our D1DatabaseCompat.
 */
export interface MinimalD1Statement {
    bind(...params: unknown[]): MinimalD1Statement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    all<T = unknown>(): Promise<{
        results: T[];
        success: boolean;
        meta?: unknown;
    }>;
    run(): Promise<{ success: boolean; meta?: unknown }>;
}

/**
 * Minimal interface for D1-like database, compatible with both Cloudflare D1 and our D1DatabaseCompat.
 */
export interface MinimalD1Database {
    prepare(query: string): MinimalD1Statement;
    batch?<_T = unknown>(statements: unknown[]): Promise<unknown[]>;
    exec?(query: string): Promise<unknown>;
}
