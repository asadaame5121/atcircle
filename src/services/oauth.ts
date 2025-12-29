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
import type { SqliteDatabaseInterface } from "../types/db.js";

export class SqliteStateStore implements NodeSavedStateStore {
    constructor(private db: SqliteDatabaseInterface) {}

    async set(key: string, val: NodeSavedState): Promise<void> {
        console.log(`[SqliteStateStore] SET key=${key}`);
        const state = JSON.stringify(val);
        await this.db
            .prepare(
                "INSERT INTO oauth_states (key, state) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state",
            )
            .bind(key, state)
            .run();
        console.log(`[SqliteStateStore] SET complete for key=${key}`);
    }

    async get(key: string): Promise<NodeSavedState | undefined> {
        console.log(`[SqliteStateStore] GET key=${key}`);
        const result = await this.db
            .prepare("SELECT state FROM oauth_states WHERE key = ?")
            .bind(key)
            .first<{ state: string }>();
        if (!result) {
            console.log(`[SqliteStateStore] GET key=${key} -> NOT FOUND`);
            return undefined;
        }
        console.log(`[SqliteStateStore] GET key=${key} -> FOUND`);
        return JSON.parse(result.state) as NodeSavedState;
    }

    async del(key: string): Promise<void> {
        console.log(`[SqliteStateStore] DEL key=${key}`);
        await this.db
            .prepare("DELETE FROM oauth_states WHERE key = ?")
            .bind(key)
            .run();
    }
}

/** @deprecated Use SqliteStateStore */
export const D1StateStore = SqliteStateStore;

export class SqliteSessionStore implements NodeSavedSessionStore {
    constructor(private db: SqliteDatabaseInterface) {}

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
    db: SqliteDatabaseInterface,
    publicUrl: string,
    bskyServiceUrl: string = BSKY_SERVICE_URL,
    plcDirectoryUrl: string = PLC_DIRECTORY_URL,
) => {
    let privateJwk: jose.JWK;
    if (OAUTH_PRIVATE_KEY) {
        try {
            console.log("[OAuth] Attempting to parse OAUTH_PRIVATE_KEY");
            const rawKey = OAUTH_PRIVATE_KEY.trim();

            if (rawKey.startsWith("{")) {
                const cleaned = rawKey.replace(/\\([":,{}])/g, "$1");
                privateJwk = JSON.parse(cleaned);
            } else {
                const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
                privateJwk = JSON.parse(decoded);
            }
            console.log("[OAuth] Successfully parsed persistent private key");
        } catch {
            console.error(
                `[OAuth] Failed to parse OAUTH_PRIVATE_KEY. First 20 chars: "${OAUTH_PRIVATE_KEY.substring(
                    0,
                    20,
                )}..."`,
            );
            const keyWrapper = await jose.generateKeyPair("ES256", {
                extractable: true,
            });
            privateJwk = await jose.exportJWK(keyWrapper.privateKey);
        }
    } else {
        console.warn(
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

    console.log(
        `[OAuth] Creating client with ID: ${appUrl}/client-metadata.json`,
    );

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
            console.log(`[OAuthFetch] START: ${url}`);
            try {
                const res = await fetch(input as any, init as any);
                console.log(
                    `[OAuthFetch] COMPLETED: ${url} (${res.status} ${res.statusText}) in ${
                        Date.now() - start
                    }ms`,
                );
                return res;
            } catch (e) {
                console.error(
                    `[OAuthFetch] FAILED: ${url} in ${Date.now() - start}ms`,
                    e,
                );
                throw e;
            }
        }) as any,
        handleResolver: {
            async resolve(handleOrDid: string) {
                const handle = handleOrDid;
                if (handle.endsWith(".test")) {
                    console.log(
                        `[CustomResolver] Resolving test handle: ${handle}`,
                    );
                    const res = await fetch(
                        `${bskyServiceUrl}/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
                    );
                    if (!res.ok) throw new Error("Handle not found");
                    const data = (await res.json()) as { did: string };
                    return { did: data.did };
                }

                try {
                    console.log(`[CustomResolver] Resolving handle: ${handle}`);
                    const res = await fetch(
                        `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
                    );
                    if (!res.ok) {
                        console.error(
                            `[CustomResolver] Handle fetch failed: ${res.status}`,
                        );
                        throw new Error("Handle fetch failed");
                    }
                    const data = (await res.json()) as { did: string };
                    console.log(
                        `[CustomResolver] Resolved to DID: ${data.did}`,
                    );
                    return { did: data.did };
                } catch (e) {
                    console.error("[CustomResolver] Error:", e);
                    throw e;
                }
            },
        } as any,
        didResolver: {
            async resolve(did: string): Promise<any> {
                console.log(`[CustomResolver] Resolving DID: ${did}`);
                if (did.startsWith("did:plc:")) {
                    try {
                        const res = await fetch(`${plcDirectoryUrl}/${did}`);
                        if (!res.ok) {
                            console.error(
                                `[CustomResolver] PLC fetch failed: ${res.status}`,
                            );
                            return null;
                        }
                        const doc = (await res.json()) as any;

                        if (doc.service && Array.isArray(doc.service)) {
                            for (const svc of doc.service) {
                                if (svc.type === "AtprotoPersonalDataServer") {
                                    if (IS_DEV) {
                                        console.log(
                                            `[CustomResolver] Rewriting PDS endpoint ${svc.serviceEndpoint} to ${bskyServiceUrl}`,
                                        );
                                        svc.serviceEndpoint = bskyServiceUrl;
                                    }
                                }
                            }
                        }

                        console.log("[CustomResolver] Resolved DID Doc");
                        return {
                            id: did,
                            ...doc,
                        };
                    } catch (e) {
                        console.error(
                            "[CustomResolver] Error resolving DID:",
                            e,
                        );
                        return null;
                    }
                }
                return null;
            },
        },
    });
};

export async function restoreAgent(
    db: SqliteDatabaseInterface,
    publicUrl: string,
    did: string,
): Promise<Agent | undefined> {
    try {
        console.log(
            `[RestoreAgent] Attempting to restore agent for DID: ${did}`,
        );
        const client = await createClient(db, publicUrl);
        const session = await client.restore(did);
        if (!session) {
            console.warn(`[RestoreAgent] No session found for DID: ${did}`);
            return undefined;
        }
        console.log("[RestoreAgent] Session restored successfully.");
        return new Agent(session);
    } catch (e) {
        console.error("[RestoreAgent] CRITICAL ERROR:", e);
        return undefined;
    }
}
