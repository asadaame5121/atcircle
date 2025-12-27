import {
    NodeOAuthClient,
    NodeSavedSession,
    NodeSavedSessionStore,
    NodeSavedState,
    NodeSavedStateStore,
} from "@atproto/oauth-client-node";
import * as jose from "jose";

type Bindings = {
    DB: D1Database;
};

export class D1StateStore implements NodeSavedStateStore {
    constructor(private db: D1Database) {}

    async set(key: string, val: NodeSavedState): Promise<void> {
        console.log(`[D1StateStore] SET key=${key}`);
        const state = JSON.stringify(val);
        await this.db.prepare(
            "INSERT INTO oauth_states (key, state) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state",
        ).bind(key, state).run();
        console.log(`[D1StateStore] SET complete for key=${key}`);
    }

    async get(key: string): Promise<NodeSavedState | undefined> {
        console.log(`[D1StateStore] GET key=${key}`);
        const result = await this.db.prepare(
            "SELECT state FROM oauth_states WHERE key = ?",
        ).bind(key).first<{ state: string }>();
        if (!result) {
            console.log(`[D1StateStore] GET key=${key} -> NOT FOUND`);
            return undefined;
        }
        console.log(`[D1StateStore] GET key=${key} -> FOUND`);
        return JSON.parse(result.state) as NodeSavedState;
    }

    async del(key: string): Promise<void> {
        console.log(`[D1StateStore] DEL key=${key}`);
        await this.db.prepare("DELETE FROM oauth_states WHERE key = ?").bind(
            key,
        ).run();
    }
}

export class D1SessionStore implements NodeSavedSessionStore {
    constructor(private db: D1Database) {}

    async set(key: string, val: NodeSavedSession): Promise<void> {
        const session = JSON.stringify(val);
        await this.db.prepare(
            "INSERT INTO oauth_states (key, state) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state",
        ).bind(`session:${key}`, session).run();
    }

    async get(key: string): Promise<NodeSavedSession | undefined> {
        const result = await this.db.prepare(
            "SELECT state FROM oauth_states WHERE key = ?",
        ).bind(`session:${key}`).first<{ state: string }>();
        if (!result) return undefined;
        return JSON.parse(result.state) as NodeSavedSession;
    }

    async del(key: string): Promise<void> {
        await this.db.prepare("DELETE FROM oauth_states WHERE key = ?").bind(
            `session:${key}`,
        ).run();
    }
}

export const createClient = async (db: D1Database, publicUrl: string) => {
    // Simple in-memory or generated key for development.
    const keyWrapper = await jose.generateKeyPair("ES256", {
        extractable: true,
    });
    const privateJwk = await jose.exportJWK(keyWrapper.privateKey);

    return new NodeOAuthClient({
        clientMetadata: {
            client_name: "Webring Dev",
            client_id: publicUrl
                ? `${publicUrl}/client-metadata.json`
                : `http://127.0.0.1:8787/client-metadata.json`,
            client_uri: publicUrl || "http://127.0.0.1:8787",
            redirect_uris: [
                publicUrl
                    ? `${publicUrl}/auth/callback`
                    : "http://127.0.0.1:8787/auth/callback",
            ],
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

        // --- Critical Custom Configuration for Cloudflare Workers ---
        // Cloudflare Workers (nodejs_compat) does not support native DNS module fully.
        // We must override the default resolvers to use HTTP requests via fetch.

        // 1. Force global fetch
        fetch: fetch,

        // 2. Custom Handle Resolver (Uses Public AppView XRPC)
        handleResolver: {
            async resolve(handle: string): Promise<any> {
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
                    const data = await res.json() as { did: string };
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
        didResolver: {
            async resolve(did: string): Promise<any> {
                console.log(`[CustomResolver] Resolving DID: ${did}`);
                // Only handle plc for now
                if (did.startsWith("did:plc:")) {
                    try {
                        const res = await fetch(`https://plc.directory/${did}`);
                        if (!res.ok) {
                            console.error(
                                `[CustomResolver] PLC fetch failed: ${res.status}`,
                            );
                            return null;
                        }
                        const doc = await res.json();
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
