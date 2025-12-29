import { Hono } from "hono";
import { html } from "hono/html";
import { getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { Layout } from "../components/Layout.js";
import { AppVariables, Bindings } from "../types/bindings.js";
import { createClient } from "../services/oauth.js";
import { PUBLIC_URL, SECRET_KEY } from "../config.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Helper to get client (lazy init or per request)
let oauthClient: any = null;
const getOAuthClient = async (db: any) => {
    if (!oauthClient) {
        oauthClient = await createClient(db, PUBLIC_URL);
    }
    return oauthClient;
};

app.get("/login", (c) => {
    const next = c.req.query("next") || "";
    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: t("auth.login_title"),
            t,
            lang,
            children: html`
                <div class="card w-96 bg-base-100 shadow-xl mx-auto mt-10">
                    <div class="card-body">
                        <h2 class="card-title justify-center text-2xl mb-4">
                            ${t("auth.login_title")}
                        </h2>
                        <p class="text-center mb-4">${t(
                            "auth.enter_handle",
                        )}</p>
                        <form action="/auth/login" method="POST">
                            <input type="hidden" name="next" value="${next}" />
                            <div class="form-control w-full max-w-xs mb-4">
                                <label class="label">
                                    <span class="label-text">${t(
                                        "auth.enter_handle",
                                    )}</span>
                                </label>
                                <input
                                    type="text"
                                    name="handle"
                                    required
                                    placeholder="${t(
                                        "auth.handle_placeholder",
                                    )}"
                                    class="input input-bordered w-full max-w-xs"
                                />
                            </div>
                            <div class="card-actions justify-center">
                                <button type="submit" class="btn btn-primary w-full">
                                    ${t("common.login")}
                                </button>
                            </div>
                        </form>
                        <div class="divider mt-6 opacity-30"></div>
                        <div class="text-xs opacity-60 leading-relaxed text-center px-4">
                            ${t("auth.permission_desc")}
                        </div>
                    </div>
                </div>
                </div>
            `,
        }),
    );
});

app.post("/auth/login", async (c) => {
    const body = await c.req.parseBody();
    const handle = body["handle"] as string;
    const next = body["next"] as string;

    if (next) {
        setCookie(c, "auth_next", next, {
            path: "/",
            maxAge: 600,
            sameSite: "Lax",
        });
    }

    try {
        console.log("Attempting login for:", handle);
        console.log("Worker Version: v9-fix (Handle Fetch)"); // Debug log
        const client = await getOAuthClient(c.env.DB as any);
        const url = await client.authorize(handle, {
            scope: "atproto transition:generic",
        });
        return c.redirect(url.toString());
    } catch (e: any) {
        console.error(e);
        const t = c.get("t");
        const lang = c.get("lang");
        return c.html(
            Layout({
                title: t("auth.error_failed"),
                t,
                lang,
                children: html`
                    <div class="card" style="max-width: 400px; margin: 0 auto; text-align: center;">
                        <h2 class="error">${t("common.brand")} Error</h2>
                        <p>${e.message}</p>
                        <a href="/login" class="btn">${t("auth.try_again")}</a>
                    </div>
                `,
            }),
        );
    }
});

app.get("/auth/callback", async (c) => {
    const client = await getOAuthClient(c.env.DB as any);
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
                const profile = (await res.json()) as { handle: string };
                handle = profile.handle;
            }
        } catch (e) {
            console.error("Failed to fetch profile for handle:", e);
        }

        // Create or Update User in DB
        const existingUser = await c.env.DB.prepare(
            "SELECT did FROM users WHERE did = ?",
        )
            .bind(session.did)
            .first();

        if (existingUser) {
            // Update handle if changed
            await c.env.DB.prepare("UPDATE users SET handle = ? WHERE did = ?")
                .bind(handle, session.did)
                .run();
        } else {
            // Register new user
            await c.env.DB.prepare(
                "INSERT INTO users (did, handle) VALUES (?, ?)",
            )
                .bind(session.did, handle)
                .run();
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

        const next = getCookie(c, "auth_next") || "/dashboard";
        setCookie(c, "auth_next", "", { path: "/", maxAge: 0 });

        return c.redirect(next);
    } catch (e) {
        console.error(e);
        const t = c.get("t");
        return c.text(t("error.auth_failed") || "Authentication failed", 401);
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
    const client = await getOAuthClient(c.env.DB as any);
    return c.json(client.clientMetadata);
});

export default app;
