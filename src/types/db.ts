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
    slug?: string | null;
    description: string | null;
    banner_url?: string | null;
    created_at?: number;
    // Calculated fields often used in SELECT
    member_count?: number;
    admin_did?: string | null;
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
 * Interface for SQLite database, used for typing the environment.
 */
export interface SqliteStatementInterface {
    bind(...params: unknown[]): SqliteStatementInterface;
    first<T = unknown>(colName?: string): Promise<T | null>;
    all<T = unknown>(): Promise<{
        results: T[];
        success: boolean;
        meta?: unknown;
    }>;
    run(): Promise<{ success: boolean; meta?: unknown }>;
}

/**
 * Interface for SQLite database, used for typing the environment.
 */
export interface SqliteDatabaseInterface {
    prepare(query: string): SqliteStatementInterface;
    batch?<_T = unknown>(statements: unknown[]): Promise<unknown[]>;
    exec?(query: string): Promise<unknown>;
}
