import {
    createCipheriv,
    createDecipheriv,
    hkdfSync,
    randomBytes,
} from "node:crypto";
import { SECRET_KEY } from "../config.js";

/**
 * Authenticated encryption (AES-256-GCM) for secrets stored in the database,
 * such as OAuth sessions containing refresh tokens and DPoP keys.
 *
 * The key is derived from SECRET_KEY with HKDF, so no extra secret needs to be
 * configured. Rotating SECRET_KEY makes stored sessions unreadable, which only
 * forces affected users to log in again.
 */

const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const deriveKey = (secret: string): Buffer =>
    Buffer.from(
        hkdfSync(
            "sha256",
            Buffer.from(secret, "utf8"),
            Buffer.from("at-circle", "utf8"),
            Buffer.from("oauth-store/v1", "utf8"),
            32,
        ),
    );

export const createSecretBox = (secret: string = SECRET_KEY) => {
    const key = deriveKey(secret);

    return {
        seal(plaintext: string): string {
            const iv = randomBytes(IV_LENGTH);
            const cipher = createCipheriv("aes-256-gcm", key, iv);
            const body = Buffer.concat([
                cipher.update(plaintext, "utf8"),
                cipher.final(),
            ]);
            const tag = cipher.getAuthTag();
            return (
                PREFIX + Buffer.concat([iv, body, tag]).toString("base64url")
            );
        },

        /**
         * Decrypts a sealed value. Values written before encryption was
         * introduced (plain JSON) are returned unchanged so existing sessions
         * keep working; they are re-encrypted on their next write.
         */
        open(stored: string): string {
            if (!stored.startsWith(PREFIX)) return stored;
            const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
            if (raw.length < IV_LENGTH + TAG_LENGTH) {
                throw new Error("Sealed value is truncated");
            }
            const iv = raw.subarray(0, IV_LENGTH);
            const tag = raw.subarray(raw.length - TAG_LENGTH);
            const body = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH);
            const decipher = createDecipheriv("aes-256-gcm", key, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([
                decipher.update(body),
                decipher.final(),
            ]).toString("utf8");
        },

        isSealed(stored: string): boolean {
            return stored.startsWith(PREFIX);
        },
    };
};

export type SecretBox = ReturnType<typeof createSecretBox>;
