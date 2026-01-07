import { Hono } from "hono";
import { SignJWT } from "jose";
import { vi } from "vitest";
import { SECRET_KEY } from "../src/config.js";
import { i18nMiddleware } from "../src/middleware/i18n.js";

/**
 * Creates a mock SQLite database for Hono Bindings.
 */
export const createMockDB = (
    data: {
        first?: any;
        all?: any[] | ((query: string, args: any[]) => any[]);
    } = {},
) => {
    return {
        prepare: vi.fn().mockImplementation((query: string) => {
            return {
                bind: vi.fn().mockImplementation((...args: any[]) => {
                    return {
                        first: vi.fn().mockImplementation(async () => {
                            if (typeof data.first === "function") {
                                return data.first(query, args);
                            }
                            return data.first;
                        }),
                        all: vi.fn().mockImplementation(async () => {
                            let results = data.all || [];
                            if (typeof data.all === "function") {
                                results = data.all(query, args);
                            }
                            return { results };
                        }),
                        run: vi.fn().mockImplementation(async () => ({
                            success: true,
                        })),
                    };
                }),
                first: vi.fn().mockImplementation(async () => {
                    if (typeof data.first === "function") {
                        return data.first(query, []);
                    }
                    return data.first;
                }),
                all: vi.fn().mockImplementation(async () => {
                    let results = data.all || [];
                    if (typeof data.all === "function") {
                        results = data.all(query, []);
                    }
                    return { results };
                }),
                run: vi.fn().mockImplementation(async () => ({
                    success: true,
                })),
            };
        }),
    } as unknown as D1Database;
};

/**
 * Creates a mock JWT token for authentication.
 */
export async function createMockAuthToken(
    did: string,
    handle: string,
    role: "admin" | "user" = "user",
) {
    const secret = new TextEncoder().encode(SECRET_KEY);
    const payload = {
        sub: did,
        handle: handle,
        role: role,
    };

    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(secret);
}

/**
 * Wraps a Hono app with necessary middlewares for testing.
 */
export function wrapApp(app: Hono<any, any, any>) {
    const wrapper = new Hono<any, any, any>();
    wrapper.use("*", i18nMiddleware());
    wrapper.route("/", app);
    return wrapper;
}
