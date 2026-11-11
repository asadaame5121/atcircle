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
        const payload = await verify(token, SECRET_KEY, "HS256");
        c.set("jwtPayload", payload);
        await next();
    } catch (_e) {
        return c.redirect("/login");
    }
};

/**
 * ログインしていればセッションの中身を、していなければ null を返す。
 * ログインしなくても見られるページで、表示を出し分けるために使う。
 */
export const getOptionalSession = async (
    c: Context,
): Promise<{ sub: string; handle?: string } | null> => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return null;
    try {
        const payload = (await verify(token, SECRET_KEY, "HS256")) as any;
        return typeof payload?.sub === "string" ? payload : null;
    } catch {
        return null;
    }
};
