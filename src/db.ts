import { type Client, createClient } from "@libsql/client";
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from "./config.js";

// SQLite Result Types
export class SqliteResult<T = unknown> {
    public success: true = true;
    constructor(
        public results: T[],
        public meta: any = {},
    ) {}
}

/** @deprecated Use SqliteResult */
export const D1Result = SqliteResult;

// SQLite Statement
export class SqliteStatement implements D1PreparedStatement {
    constructor(
        private stmt: string,
        private params: any[] = [],
        private client: Client,
    ) {}

    bind(...params: any[]): D1PreparedStatement {
        this.params = Array.isArray(params[0]) ? params[0] : params;
        return this;
    }

    async first<T = any>(colName?: string): Promise<T | null> {
        const result = await this.client.execute({
            sql: this.stmt,
            args: this.params,
        });
        const row = result.rows[0];
        if (!row) return null;
        if (colName && typeof row === "object") return row[colName] as T;
        return row as T;
    }

    async run<T = unknown>(): Promise<D1Result<T>> {
        const result = await this.client.execute({
            sql: this.stmt,
            args: this.params,
        });
        return new SqliteResult([], {
            changes: result.rowsAffected,
            last_row_id: result.lastInsertRowid,
        });
    }

    async all<T = any>(): Promise<D1Result<T>> {
        const result = await this.client.execute({
            sql: this.stmt,
            args: this.params,
        });
        // libSQL returns rows as Key-Value objects by default, which matches D1 expectations for typed results
        return new SqliteResult(result.rows as T[]);
    }

    async raw<_T = unknown[]>(options?: {
        columnNames?: boolean;
    }): Promise<any[]> {
        const result = await this.client.execute({
            sql: this.stmt,
            args: this.params,
        });

        if (options?.columnNames) {
            const columns = result.columns;
            const rows = result.rows.map((r) => Object.values(r));
            return [columns, ...rows] as any;
        }

        return result.rows.map((r) => Object.values(r));
    }
}

/** @deprecated Use SqliteStatement */
export const D1PreparedStatement = SqliteStatement;

// SQLite Database
export class SqliteDatabase implements D1Database {
    private client: Client;

    constructor(url: string, authToken?: string) {
        this.client = createClient({
            url,
            authToken,
        });
    }

    prepare(query: string): D1PreparedStatement {
        return new SqliteStatement(query, [], this.client);
    }

    async exec(query: string): Promise<D1ExecResult> {
        await this.client.executeMultiple(query);
        return {
            count: 0,
            duration: 0,
        };
    }

    async batch<T = unknown>(
        statements: D1PreparedStatement[],
    ): Promise<D1Result<T>[]> {
        // libSQL client supports transaction/batch
        // But for D1 compatibility we need to execute them.
        // We can use a transaction here.
        const transaction = await this.client.transaction("write");
        const results: D1Result<T>[] = [];

        try {
            for (const stmt of statements) {
                if (stmt instanceof SqliteStatement) {
                    // We need to access private properties... or just reconstruct execution
                    // Since we can't easily access private props of SqliteStatement cleanly without exposing them,
                    // we might need to change SqliteStatement or use 'any' cast.
                    // Ideally SqliteStatement should have an 'executeWith(client/transaction)' method.
                    // For now, let's implement a 'execute' method on SqliteStatement.
                    // Wait, we can't easily pass the transaction to the existing statement instance methods.

                    // Workaround: Re-implement execution using the transaction
                    // This relies on us knowing the internals of SqliteStatement (stmt, params)
                    const s = stmt as any;
                    const res = await transaction.execute({
                        sql: s.stmt,
                        args: s.params,
                    });
                    results.push(new SqliteResult(res.rows as T[]));
                } else {
                    throw new Error("Invalid statement type in batch");
                }
            }
            await transaction.commit();
        } catch (e) {
            await transaction.close(); // Rollback is automatic on close/refresh usually, but explicit close is good
            throw e;
        }

        return results;
    }

    async dump(): Promise<ArrayBuffer> {
        throw new Error("dump() not implemented in SqliteDatabase adapter");
    }

    // Stub for withSession (D1 feature)
    withSession(_bookmark?: string): D1DatabaseSession {
        return this as any as D1DatabaseSession;
    }

    // Helper to access raw client if needed (for closing)
    getClient() {
        return this.client;
    }
}

/** @deprecated Use SqliteDatabase */
export const D1DatabaseCompat = SqliteDatabase;

// Initialize DB (singleton for the app)
const dbUrl = TURSO_DATABASE_URL || process.env.DB_PATH || "file:dev.db";
const dbAuthToken = TURSO_AUTH_TOKEN;

let db: SqliteDatabase;

try {
    db = new SqliteDatabase(dbUrl, dbAuthToken);
} catch (e) {
    console.warn("Failed to initialize SqliteDatabase:", e);
    db = {} as any;
}

// --- Auto-Migration / Schema Initialization ---
if (db && db instanceof SqliteDatabase) {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        did TEXT PRIMARY KEY,
        handle TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_did TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        rss_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_did) REFERENCES users(did)
    );

    CREATE TABLE IF NOT EXISTS antenna_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        published_at INTEGER,
        FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sites_user_did ON sites(user_did);
    CREATE INDEX IF NOT EXISTS idx_antenna_items_site_id ON antenna_items(site_id);
    CREATE INDEX IF NOT EXISTS idx_antenna_items_published_at ON antenna_items(published_at DESC);

    CREATE TABLE IF NOT EXISTS oauth_states (
        key TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS rings (
        uri TEXT PRIMARY KEY,
        owner_did TEXT NOT NULL,
        admin_did TEXT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        acceptance_policy TEXT DEFAULT 'automatic',
        status TEXT DEFAULT 'open',
        banner_url TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS join_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ring_uri TEXT NOT NULL,
        user_did TEXT NOT NULL,
        site_url TEXT NOT NULL,
        site_title TEXT NOT NULL,
        rss_url TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        atproto_uri TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (ring_uri) REFERENCES rings(uri)
    );

    CREATE TABLE IF NOT EXISTS memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ring_uri TEXT NOT NULL,
        site_id INTEGER NOT NULL,
        member_uri TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'approved',
        widget_installed INTEGER DEFAULT 0,
        last_verified_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (ring_uri) REFERENCES rings(uri),
        FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    CREATE TABLE IF NOT EXISTS block_records (
        uri TEXT PRIMARY KEY,
        ring_uri TEXT NOT NULL,
        subject_did TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (ring_uri) REFERENCES rings(uri)
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_ring_uri ON memberships(ring_uri);
    CREATE INDEX IF NOT EXISTS idx_memberships_site_id ON memberships(site_id);
    `);

    // --- Migrations for existing DB (Idempotent) ---
    const silentExec = (q: string) => db.exec(q).catch(() => {});

    await silentExec(
        "ALTER TABLE rings ADD COLUMN acceptance_policy TEXT DEFAULT 'automatic';",
    );
    await silentExec(
        "ALTER TABLE rings ADD COLUMN status TEXT DEFAULT 'open';",
    );
    await silentExec(
        "ALTER TABLE memberships ADD COLUMN status TEXT DEFAULT 'approved';",
    );
    await silentExec("ALTER TABLE rings ADD COLUMN banner_url TEXT;");
    await silentExec("ALTER TABLE rings ADD COLUMN admin_did TEXT;");
    await silentExec("ALTER TABLE rings ADD COLUMN slug TEXT;");
    await silentExec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_rings_slug ON rings(slug) WHERE slug IS NOT NULL;",
    );
    await silentExec(
        "ALTER TABLE memberships ADD COLUMN widget_installed INTEGER DEFAULT 0;",
    );
    await silentExec(
        "ALTER TABLE memberships ADD COLUMN last_verified_at INTEGER;",
    );
}

export default db;
