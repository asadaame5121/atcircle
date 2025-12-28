import { Hono } from "hono";
import { html } from "hono/html";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { Layout } from "../components/Layout";
import { Bindings } from "../types/bindings";
import { createClient } from "../services/oauth";
import { PUBLIC_URL, SECRET_KEY } from "../config";
import { D1Database } from "@cloudflare/workers-types";

const app = new Hono<{ Bindings: Bindings }>();

// Helper to get client (lazy init or per request)
let oauthClient: any = null;
const getOAuthClient = async (db: D1Database) => {
    if (!oauthClient) {
        oauthClient = await createClient(db, PUBLIC_URL);
    }
    return oauthClient;
};

app.get("/login", (c) => {
    return c.html(Layout({
        title: "Login",
        children: html`
            <div class="card w-96 bg-base-100 shadow-xl mx-auto mt-10">
                <div class="card-body">
                    <h2 class="card-title justify-center text-2xl mb-4">
                        Join the Webring
                    </h2>
                    <p class="text-center mb-4">Enter your Bluesky handle.</p>
                    <form action="/auth/login" method="POST">
                        <div class="form-control w-full max-w-xs mb-4">
                            <label class="label">
                                <span class="label-text">Bluesky Handle</span>
                            </label>
                            <input
                                type="text"
                                name="handle"
                                required
                                placeholder="example.bsky.social"
                                class="input input-bordered w-full max-w-xs"
                            />
                        </div>
                        <div class="card-actions justify-center">
                            <button type="submit" class="btn btn-primary w-full">
                                Login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            </div>
        `,
    }));
});

app.post("/auth/login", async (c) => {
    const body = await c.req.parseBody();
    const handle = body["handle"] as string;

    try {
        console.log("Attempting login for:", handle);
        console.log("Worker Version: v9-fix (Handle Fetch)"); // Debug log
        const client = await getOAuthClient(
            c.env.DB,
        );
        const url = await client.authorize(handle, {
            scope: "atproto transition:generic",
        });
        return c.redirect(url.toString());
    } catch (e: any) {
        console.error(e);
        return c.html(Layout({
            title: "Login Error",
            children: html`
                <div class="card" style="max-width: 400px; margin: 0 auto; text-align: center;">
                    <h2 class="error">Error</h2>
                    <p>${e.message}</p>
                    <a href="/login" class="btn">Try Again</a>
                </div>
            `,
        }));
    }
});

app.get("/auth/callback", async (c) => {
    const client = await getOAuthClient(c.env.DB);
    const params = new URLSearchParams(c.req.query());
    console.log(`[AuthCallback] Received callback: ${params.toString()}`);

    try {
        console.log("[AuthCallback] Calling client.callback()...");
        const { session } = await client.callback(params);
        console.log(`[AuthCallback] Session established for ${session.did}`);

        // Session contains did, handle, tokens.
        // We can now create our own app session OR use the ATProto tokens directly.
        // For simplicity, let's stick to our own JWT cookie for the app session,
        // but store the ATProto tokens in our DB if we need to make API calls later.

        // Resolve handle from DID (OAuthSession doesn't contain handle directly)
        let handle = "unknown";
        try {
            const res = await fetch(
                `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${session.did}`,
            );
            if (res.ok) {
                const profile = await res.json() as { handle: string };
                handle = profile.handle;
            }
        } catch (e) {
            console.error("Failed to fetch profile for handle:", e);
        }

        // Create or Update User in DB
        const existingUser = await c.env.DB.prepare(
            "SELECT did FROM users WHERE did = ?",
        ).bind(session.did).first();

        if (existingUser) {
            // Update handle if changed
            await c.env.DB.prepare(
                "UPDATE users SET handle = ? WHERE did = ?",
            ).bind(handle, session.did).run();
        } else {
            // Register new user
            await c.env.DB.prepare(
                "INSERT INTO users (did, handle) VALUES (?, ?)",
            ).bind(session.did, handle).run();
        }

        // Create App Session
        const payload = {
            sub: session.did,
            handle: handle,
            role: "user",
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
        };

        const token = await sign(payload, SECRET_KEY);

        setCookie(c, "session", token, {
            path: "/",
            secure: false, // Dev
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "Lax",
        });

        return c.redirect("/dashboard");
    } catch (e) {
        console.error(e);
        return c.text("Authentication failed", 401);
    }
});

app.get("/logout", (c) => {
    return c.redirect("/");
});

app.post("/logout", (c) => {
    setCookie(c, "session", "", {
        path: "/",
        maxAge: 0,
    });
    return c.redirect("/");
});

app.get("/client-metadata.json", async (c) => {
    const client = await getOAuthClient(
        c.env.DB,
    );
    return c.json(client.clientMetadata);
});

export default app;
