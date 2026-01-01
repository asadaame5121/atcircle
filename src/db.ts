import { DatabaseSync } from "node:sqlite";

// SQLite Result Types
export class SqliteResult<T = unknown> {
    constructor(
        public success: boolean,
        public results: T[],
        public meta: any = {},
    ) {}
}

/** @deprecated Use SqliteResult */
export const D1Result = SqliteResult;

// SQLite Statement
export class SqliteStatement {
    constructor(
        private stmt: any,
        private params: any[] = [],
    ) {}

    bind(...params: any[]) {
        this.params = Array.isArray(params[0]) ? params[0] : params;
        return this;
    }

    async first<T = any>(colName?: string): Promise<T | null> {
        const result = this.stmt.get(...this.params) as any;
        if (!result) return null;
        if (colName && typeof result === "object") return result[colName];
        return result as T;
    }

    async run() {
        const info = this.stmt.run(...this.params);
        return { success: true, results: [], meta: info };
    }

    async all<T = any>() {
        const results = this.stmt.all(...this.params);
        return new SqliteResult(true, results as T[]);
    }
}

/** @deprecated Use SqliteStatement */
export const D1PreparedStatement = SqliteStatement;

// SQLite Database
export class SqliteDatabase {
    private db: DatabaseSync;

    constructor(filename: string) {
        this.db = new DatabaseSync(filename);
        this.db.exec("PRAGMA journal_mode = WAL;"); // Recommended for SQLite
    }

    prepare(query: string) {
        return new SqliteStatement(this.db.prepare(query));
    }

    async exec(query: string) {
        this.db.exec(query);
        return new SqliteResult(true, []);
    }

    async batch<_T = any>(statements: SqliteStatement[]) {
        const results = [];
        for (const stmt of statements) {
            results.push(await stmt.all());
        }
        return results;
    }

    // Helper to access raw db if needed
    getRawDb() {
        return this.db;
    }
}

/** @deprecated Use SqliteDatabase */
export const D1DatabaseCompat = SqliteDatabase;

// Initialize DB (singleton for the app)
const dbPath = process.env.DB_PATH || "dev.db";
const db = new SqliteDatabase(dbPath);

// --- Auto-Migration / Schema Initialization ---
// Ensure tables exist on startup
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

// --- Migrations for existing DB ---
// We use .catch(() => {}) because these might fail if columns already exist, and that's okay.
await db
    .exec(
        "ALTER TABLE rings ADD COLUMN acceptance_policy TEXT DEFAULT 'automatic';",
    )
    .catch(() => {});
await db
    .exec("ALTER TABLE rings ADD COLUMN status TEXT DEFAULT 'open';")
    .catch(() => {});
await db
    .exec("ALTER TABLE memberships ADD COLUMN status TEXT DEFAULT 'approved';")
    .catch(() => {});
await db.exec("ALTER TABLE rings ADD COLUMN banner_url TEXT;").catch(() => {});
await db.exec("ALTER TABLE rings ADD COLUMN admin_did TEXT;").catch(() => {});
await db.exec("ALTER TABLE rings ADD COLUMN slug TEXT;").catch(() => {});
await db
    .exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_rings_slug ON rings(slug) WHERE slug IS NOT NULL;",
    )
    .catch(() => {});

export default db;
