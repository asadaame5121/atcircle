import { Agent } from "@atproto/api";
import {
    NodeOAuthClient,
    type NodeSavedSession,
    type NodeSavedSessionStore,
    type NodeSavedState,
    type NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import * as jose from "jose";
import {
    BSKY_SERVICE_URL,
    CLIENT_NAME,
    IS_DEV,
    OAUTH_PRIVATE_KEY,
    PLC_DIRECTORY_URL,
} from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
// import type { SqliteDatabaseInterface } from "../types/db.js";

export class SqliteStateStore implements NodeSavedStateStore {
    constructor(private db: D1Database) {}

    async set(key: string, val: NodeSavedState): Promise<void> {
        pinoLogger.debug({ msg: "[SqliteStateStore] SET", key });
        const state = JSON.stringify(val);
        await this.db
            .prepare(
                "INSERT INTO oauth_states (key, state) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state",
            )
            .bind(key, state)
            .run();
        pinoLogger.debug({ msg: "[SqliteStateStore] SET complete", key });
    }

    async get(key: string): Promise<NodeSavedState | undefined> {
        pinoLogger.debug({ msg: "[SqliteStateStore] GET", key });
        const result = await this.db
            .prepare("SELECT state FROM oauth_states WHERE key = ?")
            .bind(key)
            .first<{ state: string }>();
        if (!result) {
            pinoLogger.debug({
                msg: "[SqliteStateStore] GET -> NOT FOUND",
                key,
            });
            return undefined;
        }
        pinoLogger.debug({ msg: "[SqliteStateStore] GET -> FOUND", key });
        return JSON.parse(result.state) as NodeSavedState;
    }

    async del(key: string): Promise<void> {
        pinoLogger.debug({ msg: "[SqliteStateStore] DEL", key });
        await this.db
            .prepare("DELETE FROM oauth_states WHERE key = ?")
            .bind(key)
            .run();
    }
}

/** @deprecated Use SqliteStateStore */
export const D1StateStore = SqliteStateStore;

export class SqliteSessionStore implements NodeSavedSessionStore {
    constructor(private db: D1Database) {}

    async set(key: string, val: NodeSavedSession): Promise<void> {
        const session = JSON.stringify(val);
        await this.db
            .prepare(
                "INSERT INTO oauth_states (key, state) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state",
            )
            .bind(`session:${key}`, session)
            .run();
    }

    async get(key: string): Promise<NodeSavedSession | undefined> {
        const result = await this.db
            .prepare("SELECT state FROM oauth_states WHERE key = ?")
            .bind(`session:${key}`)
            .first<{ state: string }>();
        if (!result) return undefined;
        return JSON.parse(result.state) as NodeSavedSession;
    }

    async del(key: string): Promise<void> {
        await this.db
            .prepare("DELETE FROM oauth_states WHERE key = ?")
            .bind(`session:${key}`)
            .run();
    }
}

/** @deprecated Use SqliteSessionStore */
export const D1SessionStore = SqliteSessionStore;

export const createClient = async (
    db: D1Database,
    publicUrl: string,
    bskyServiceUrl: string = BSKY_SERVICE_URL,
    plcDirectoryUrl: string = PLC_DIRECTORY_URL,
) => {
    let privateJwk: jose.JWK;
    if (OAUTH_PRIVATE_KEY) {
        try {
            pinoLogger.info("[OAuth] Attempting to parse OAUTH_PRIVATE_KEY");
            const rawKey = OAUTH_PRIVATE_KEY.trim();

            if (rawKey.startsWith("{")) {
                const cleaned = rawKey.replace(/\\([":,{}])/g, "$1");
                privateJwk = JSON.parse(cleaned);
            } else {
                const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
                privateJwk = JSON.parse(decoded);
            }
            pinoLogger.info(
                "[OAuth] Successfully parsed persistent private key",
            );
        } catch {
            pinoLogger.error({
                msg: "[OAuth] Failed to parse OAUTH_PRIVATE_KEY",
                preview: OAUTH_PRIVATE_KEY.substring(0, 20),
            });
            const keyWrapper = await jose.generateKeyPair("ES256", {
                extractable: true,
            });
            privateJwk = await jose.exportJWK(keyWrapper.privateKey);
        }
    } else {
        pinoLogger.warn(
            "[OAuth] No OAUTH_PRIVATE_KEY provided. Sessions will be lost after server restart.",
        );
        const keyWrapper = await jose.generateKeyPair("ES256", {
            extractable: true,
        });
        privateJwk = await jose.exportJWK(keyWrapper.privateKey);
    }

    const appUrl = publicUrl
        .replace("localhost", "127.0.0.1")
        .replace(/\/$/, "");

    pinoLogger.info({
        msg: "[OAuth] Creating client",
        clientId: `${appUrl}/client-metadata.json`,
    });

    return new NodeOAuthClient({
        clientMetadata: {
            client_name: CLIENT_NAME,
            client_id: `${appUrl}/client-metadata.json`,
            client_uri: appUrl,
            redirect_uris: [`${appUrl}/auth/callback`],
            scope: "atproto transition:generic",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            application_type: "web",
            token_endpoint_auth_method: "none",
            dpop_bound_access_tokens: true,
        },
        keyset: [privateJwk] as any,
        stateStore: new SqliteStateStore(db),
        sessionStore: new SqliteSessionStore(db),
        allowHttp: true,
        fetch: (async (input: any, init: any) => {
            const url = typeof input === "string" ? input : (input as any).url;
            const start = Date.now();
            pinoLogger.debug({ msg: "[OAuthFetch] START", url });
            try {
                const res = await fetch(input as any, init as any);
                pinoLogger.debug({
                    msg: "[OAuthFetch] COMPLETED",
                    url,
                    status: res.status,
                    duration: `${Date.now() - start}ms`,
                });
                return res;
            } catch (e) {
                pinoLogger.error({
                    msg: "[OAuthFetch] FAILED",
                    url,
                    duration: `${Date.now() - start}ms`,
                    error: e,
                });
                throw e;
            }
        }) as any,
        handleResolver: {
            async resolve(handleOrDid: string): Promise<string> {
                if (handleOrDid.startsWith("did:")) {
                    return handleOrDid;
                }
                const handle = handleOrDid;
                if (handle.endsWith(".test")) {
                    pinoLogger.info({
                        msg: "[CustomResolver] Resolving test handle",
                        handle,
                    });
                    const res = await fetch(
                        `${bskyServiceUrl}/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
                    );
                    if (!res.ok) throw new Error("Handle not found");
                    const data = (await res.json()) as { did: string };
                    return data.did;
                }

                try {
                    pinoLogger.info({
                        msg: "[CustomResolver] Resolving handle",
                        handle,
                    });
                    const res = await fetch(
                        `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
                    );
                    if (!res.ok) {
                        pinoLogger.error({
                            msg: "[CustomResolver] Handle fetch failed",
                            status: res.status,
                        });
                        throw new Error("Handle fetch failed");
                    }
                    const data = (await res.json()) as { did: string };
                    pinoLogger.info({
                        msg: "[CustomResolver] Resolved to DID",
                        did: data.did,
                    });
                    return data.did;
                } catch (e) {
                    pinoLogger.error({
                        msg: "[CustomResolver] Error",
                        error: e,
                    });
                    throw e;
                }
            },
        } as any,
        didResolver: {
            async resolve(did: string): Promise<any> {
                if (typeof did !== "string") {
                    pinoLogger.error({
                        msg: "[CustomResolver] DID is not a string",
                        did,
                        type: typeof did,
                    });
                    return null;
                }
                pinoLogger.info({ msg: "[CustomResolver] Resolving DID", did });
                if (did.startsWith("did:plc:")) {
                    try {
                        const res = await fetch(`${plcDirectoryUrl}/${did}`);
                        if (!res.ok) {
                            pinoLogger.error({
                                msg: "[CustomResolver] PLC fetch failed",
                                status: res.status,
                            });
                            return null;
                        }
                        const doc = (await res.json()) as any;

                        if (doc.service && Array.isArray(doc.service)) {
                            for (const svc of doc.service) {
                                if (svc.type === "AtprotoPersonalDataServer") {
                                    if (IS_DEV) {
                                        pinoLogger.info({
                                            msg: "[CustomResolver] Rewriting PDS endpoint",
                                            from: svc.serviceEndpoint,
                                            to: bskyServiceUrl,
                                        });
                                        svc.serviceEndpoint = bskyServiceUrl;
                                    }
                                }
                            }
                        }

                        pinoLogger.info({
                            msg: "[CustomResolver] Resolved DID Doc",
                            did,
                        });
                        return {
                            id: did,
                            ...doc,
                        };
                    } catch (e) {
                        pinoLogger.error({
                            msg: "[CustomResolver] Error resolving DID",
                            error: e,
                        });
                        return null;
                    }
                }
                return null;
            },
        },
    });
};

export async function restoreAgent(
    db: D1Database,
    publicUrl: string,
    did: string,
): Promise<Agent | undefined> {
    try {
        pinoLogger.info({ msg: "[RestoreAgent] Attempting restore", did });
        if (did === "did:plc:dev-mock-user") {
            pinoLogger.info(
                "[RestoreAgent] Debug mock user detected. Skipping restoration.",
            );
            return undefined;
        }
        const client = await createClient(db, publicUrl);
        const session = await client.restore(did);
        if (!session) {
            pinoLogger.warn({ msg: "[RestoreAgent] No session found", did });
            return undefined;
        }
        pinoLogger.info({
            msg: "[RestoreAgent] Session restored successfully",
            did,
        });
        return new Agent(session);
    } catch (e) {
        pinoLogger.error({ msg: "[RestoreAgent] CRITICAL ERROR", error: e });
        return undefined;
    }
}
