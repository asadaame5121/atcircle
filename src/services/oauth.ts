import {
    NodeOAuthClient,
    NodeSavedSession,
    NodeSavedSessionStore,
    NodeSavedState,
    NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import * as jose from "jose";
import {
    BSKY_SERVICE_URL,
    CLIENT_NAME,
    IS_DEV,
    OAUTH_PRIVATE_KEY,
    PLC_DIRECTORY_URL,
    PUBLIC_URL,
    SECRET_KEY,
} from "../config.js";
import { Agent } from "@atproto/api";
import { D1Database } from "@cloudflare/workers-types";

type Bindings = {
    DB: D1Database;
};

export class D1StateStore implements NodeSavedStateStore {
    constructor(private db: D1Database | any) {}

    async set(key: string, val: NodeSavedState): Promise<void> {
        console.log(`[D1StateStore] SET key=${key}`);
        const state = JSON.stringify(val);
        await this.db
            .prepare(
                "INSERT INTO oauth_states (key, state) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state",
            )
            .bind(key, state)
            .run();
        console.log(`[D1StateStore] SET complete for key=${key}`);
    }

    async get(key: string): Promise<NodeSavedState | undefined> {
        console.log(`[D1StateStore] GET key=${key}`);
        const result = await (
            this.db
                .prepare("SELECT state FROM oauth_states WHERE key = ?")
                .bind(key).first as any
        )();
        if (!result) {
            console.log(`[D1StateStore] GET key=${key} -> NOT FOUND`);
            return undefined;
        }
        console.log(`[D1StateStore] GET key=${key} -> FOUND`);
        return JSON.parse(result.state) as NodeSavedState;
    }

    async del(key: string): Promise<void> {
        console.log(`[D1StateStore] DEL key=${key}`);
        await this.db
            .prepare("DELETE FROM oauth_states WHERE key = ?")
            .bind(key)
            .run();
    }
}

export class D1SessionStore implements NodeSavedSessionStore {
    constructor(private db: D1Database | any) {}

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
        const result = await (
            this.db
                .prepare("SELECT state FROM oauth_states WHERE key = ?")
                .bind(`session:${key}`).first as any
        )();
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

export const createClient = async (
    db: D1Database | any,
    publicUrl: string,
    bskyServiceUrl: string = BSKY_SERVICE_URL,
    plcDirectoryUrl: string = PLC_DIRECTORY_URL,
) => {
    let privateJwk: jose.JWK;
    if (OAUTH_PRIVATE_KEY) {
        try {
            console.log("[OAuth] Attempting to parse OAUTH_PRIVATE_KEY");
            let rawKey = OAUTH_PRIVATE_KEY.trim();

            // 1. Try raw JSON parsing first (with basic cleanup)
            try {
                // If it starts with '{' it's likely raw JSON
                if (rawKey.startsWith("{")) {
                    // Basic cleanup for redundant shell escapes just in case
                    const cleaned = rawKey.replace(/\\([":,{}])/g, "$1");
                    privateJwk = JSON.parse(cleaned);
                } else {
                    throw new Error("Not raw JSON");
                }
            } catch (e) {
                // 2. Try Base64 decoding
                console.log("[OAuth] Not raw JSON, attempting Base64 decode");
                const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
                privateJwk = JSON.parse(decoded);
            }
            console.log("[OAuth] Successfully parsed persistent private key");
        } catch (e) {
            console.error(
                `[OAuth] Failed to parse OAUTH_PRIVATE_KEY. First 20 chars: "${OAUTH_PRIVATE_KEY.substring(
                    0,
                    20,
                )}..."`,
            );
            console.error("[OAuth] Parse error:", e);
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

    // 1. localhost 文字列を 127.0.0.1 に置換する
    // これにより、ライブラリの「localhost専用のバグっぽい制限」を回避します
    const appUrl = publicUrl
        .replace("localhost", "127.0.0.1")
        .replace(/\/$/, "");

    console.log(
        `[OAuth] Creating client with ID: ${appUrl}/client-metadata.json`,
    );

    return new NodeOAuthClient({
        clientMetadata: {
            client_name: CLIENT_NAME,
            // 2. 127.0.0.1 ならパスが付いていても TypeError になりにくい
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
        keyset: [privateJwk as any],
        stateStore: new D1StateStore(db),
        sessionStore: new D1SessionStore(db),
        // 3. HTTP通信を許可
        allowHttp: true,
        // 4. カスタム fetch (ログ出力付き)
        fetch: (async (input: any, init: any) => {
            const url = typeof input === "string" ? input : input.url;
            const start = Date.now();
            console.log(`[OAuthFetch] START: ${url}`);
            try {
                const res = await fetch(input, init);
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
        // 2. Custom Handle Resolver (Uses Public AppView XRPC)
        handleResolver: {
            async resolve(handle: string): Promise<any> {
                // Short-circuit for local testing handles if needed, or query local PDS.
                // If handle is "alice.test", real Bsky won't know it.
                if (handle.endsWith(".test")) {
                    console.log(
                        `[CustomResolver] Resolving test handle: ${handle}`,
                    );
                    // Try resolving via local PDS (bskyServiceUrl)
                    const res = await fetch(
                        `${bskyServiceUrl}/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
                    );
                    if (!res.ok) return null;
                    const data = (await res.json()) as { did: string };
                    return data.did;
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
                        return null;
                    }
                    const data = (await res.json()) as { did: string };
                    console.log(
                        `[CustomResolver] Resolved to DID: ${data.did}`,
                    );
                    return data.did;
                } catch (e) {
                    console.error("[CustomResolver] Error:", e);
                    return null;
                }
            },
        },

        // 3. Custom DID Resolver (Uses PLC Directory HTTP API)
        // Update: Now that we are on Node, we can potentially reach "localhost" PDS ports if running locally.
        // But if PDS is on ngrok, we use that.
        didResolver: {
            async resolve(did: string): Promise<any> {
                console.log(`[CustomResolver] Resolving DID: ${did}`);
                // Only handle plc for now
                if (did.startsWith("did:plc:")) {
                    try {
                        // Use PLC Directory URL from config/env
                        const res = await fetch(`${plcDirectoryUrl}/${did}`);
                        if (!res.ok) {
                            console.error(
                                `[CustomResolver] PLC fetch failed: ${res.status}`,
                            );
                            return null;
                        }
                        const doc = (await res.json()) as any;

                        // Rewrite Service Endpoint logic (from previous plan)
                        // If PDS is local/docker/ngrok, ensure we point to the accessible URL (bskyServiceUrl).
                        if (doc.service && Array.isArray(doc.service)) {
                            for (const svc of doc.service) {
                                if (svc.type === "AtprotoPersonalDataServer") {
                                    // 開発環境（ローカルPDS/dev-env）の場合のみ、PDSの向き先を書き換える
                                    if (IS_DEV) {
                                        console.log(
                                            `[CustomResolver] Rewriting PDS endpoint ${svc.serviceEndpoint} to ${bskyServiceUrl}`,
                                        );
                                        svc.serviceEndpoint = bskyServiceUrl;
                                    }
                                }
                            }
                        }

                        console.log(`[CustomResolver] Resolved DID Doc`);
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
                // Fallback (will likely fail if it tries DNS)
                return null;
            },
        },
    });
};

export async function restoreAgent(
    db: D1Database | any,
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
        console.log(`[RestoreAgent] Session restored successfully.`);
        return new Agent(session);
    } catch (e) {
        console.error("[RestoreAgent] CRITICAL ERROR:", e);
        return undefined;
    }
}
