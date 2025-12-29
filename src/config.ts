export const PORT = Number(process.env.PORT) || 8080;
export const DB_PATH = process.env.DB_PATH || "./dev.db";
export const PUBLIC_URL = (
    process.env.PUBLIC_URL || `http://localhost:${PORT}`
).replace(/\/$/, "");
export const BSKY_SERVICE_URL =
    process.env.BSKY_SERVICE_URL || "https://bsky.social";
export const PLC_DIRECTORY_URL =
    process.env.PLC_DIRECTORY_URL || "https://plc.directory";
export const SECRET_KEY =
    process.env.SECRET_KEY || "dev-secret-key-change-this-in-prod";
export const CLIENT_NAME = process.env.CLIENT_NAME || "Webring Dev";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_DEV = NODE_ENV === "development";
export const OAUTH_PRIVATE_KEY = process.env.OAUTH_PRIVATE_KEY;
