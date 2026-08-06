import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Session Cookie Name", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("uses '__Host-session' in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("SECRET_KEY", "strong-production-key-for-test-12345");

        const { SESSION_COOKIE } = await import("../lib/session.js");
        expect(SESSION_COOKIE).toBe("__Host-session");
    });

    it("uses 'session' in development", async () => {
        vi.stubEnv("NODE_ENV", "development");

        const { SESSION_COOKIE } = await import("../lib/session.js");
        expect(SESSION_COOKIE).toBe("session");
    });

    it("uses 'session' when NODE_ENV is not set", async () => {
        delete process.env.NODE_ENV;

        const { SESSION_COOKIE } = await import("../lib/session.js");
        expect(SESSION_COOKIE).toBe("session");
    });
});
