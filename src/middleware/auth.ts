import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { ADMIN_DID, SECRET_KEY, ZAP_SCAN_KEY } from "../config.js";

export const authMiddleware = async (c: Context, next: Next) => {
    // 1. ZAP Bypass (High Priority)
    // Only active if ZAP_SCAN_KEY is set in env
    const zapHeader = c.req.header("X-Zap-Scan");
    if (ZAP_SCAN_KEY && zapHeader === ZAP_SCAN_KEY) {
        c.set("jwtPayload", {
            sub: ADMIN_DID || "did:plc:zap-admin",
            handle: "zap-admin.test",
            role: "admin",
            isDebug: true,
            isZap: true,
        });
        await next();
        return;
    }

    // 2. Standard Session Cookie
    const token = getCookie(c, "session");
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
