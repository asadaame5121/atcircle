import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { SECRET_KEY } from "../config.js";
import { SESSION_COOKIE } from "../lib/session.js";

export const authMiddleware = async (c: Context, next: Next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) {
        const url = new URL(c.req.url);
        return c.redirect(
            `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
        );
    }

    try {
        const payload = await verify(token, SECRET_KEY);
        c.set("jwtPayload", payload);
        await next();
    } catch (_e) {
        return c.redirect("/login");
    }
};
