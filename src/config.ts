export const PORT = Number(process.env.PORT) || 8080;
export const DB_PATH = process.env.DB_PATH || "./dev.db";
export const PUBLIC_URL = (
    process.env.PUBLIC_URL || `http://localhost:${PORT}`
).replace(/\/$/, "");
export const BSKY_SERVICE_URL =
    process.env.BSKY_SERVICE_URL || "https://bsky.social";
export const PLC_DIRECTORY_URL =
    process.env.PLC_DIRECTORY_URL || "https://plc.directory";
// Identity/AppView endpoint for handle/profile resolution.
// Set to the dev PDS URL in dev environments (the dev PDS can only resolve its own handles).
export const IDENTITY_RESOLVER_URL =
    process.env.IDENTITY_RESOLVER_URL || "https://public.api.bsky.app";
export const CLIENT_NAME = process.env.CLIENT_NAME || "AT CIRCLE";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_DEV = NODE_ENV === "development";
export const IS_PROD = NODE_ENV === "production";
export const DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS === "true";

const DEFAULT_SECRET_KEY = "dev-secret-key-change-this-in-prod";
export const SECRET_KEY = process.env.SECRET_KEY || DEFAULT_SECRET_KEY;
if (IS_PROD && (!process.env.SECRET_KEY || SECRET_KEY === DEFAULT_SECRET_KEY)) {
    throw new Error(
        "SECRET_KEY must be set to a strong, non-default value in production (NODE_ENV=production). Refusing to start.",
    );
}

export const OAUTH_PRIVATE_KEY = process.env.OAUTH_PRIVATE_KEY;
export const ADMIN_DID = process.env.ADMIN_DID;
export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Public ATProto indexes used instead of a local database:
// - Slingshot: cached record reads (com.atproto.repo.getRecord) for any repo
// - Constellation: backlink index (which records point at a ring)
export const SLINGSHOT_URL = (
    process.env.SLINGSHOT_URL || "https://slingshot.microcosm.blue"
).replace(/\/$/, "");
export const CONSTELLATION_URL = (
    process.env.CONSTELLATION_URL || "https://constellation.microcosm.blue"
).replace(/\/$/, "");

// 承認通知を送る公式アカウント。アプリパスワードが未設定なら通知しない
export const NOTIFY_HANDLE =
    process.env.NOTIFY_HANDLE || "atcircle.bsky.social";
export const NOTIFY_APP_PASSWORD = process.env.NOTIFY_APP_PASSWORD || undefined;
export const NOTIFY_SERVICE =
    process.env.NOTIFY_SERVICE || "https://bsky.social";
