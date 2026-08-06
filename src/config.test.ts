import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Config — SECRET_KEY fail-fast", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("throws when NODE_ENV=production and SECRET_KEY is not set", async () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("SECRET_KEY", "");

        await expect(() => import("./config.js")).rejects.toThrow(
            "SECRET_KEY must be set to a strong, non-default value in production",
        );
    });

    it("throws when NODE_ENV=production and SECRET_KEY is the default value", async () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("SECRET_KEY", "dev-secret-key-change-this-in-prod");

        await expect(() => import("./config.js")).rejects.toThrow(
            "SECRET_KEY must be set to a strong, non-default value in production",
        );
    });

    it("does not throw when NODE_ENV=production and SECRET_KEY is a strong value", async () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("SECRET_KEY", "super-secret-production-key-12345");

        const config = await import("./config.js");
        expect(config.SECRET_KEY).toBe("super-secret-production-key-12345");
        expect(config.IS_PROD).toBe(true);
    });

    it("does not throw when NODE_ENV=development even without SECRET_KEY", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("SECRET_KEY", "");

        const config = await import("./config.js");
        expect(config.IS_DEV).toBe(true);
        expect(config.SECRET_KEY).toBe("dev-secret-key-change-this-in-prod");
    });

    it("sets IS_DEV and IS_PROD correctly based on NODE_ENV", async () => {
        vi.stubEnv("NODE_ENV", "development");
        const config = await import("./config.js");
        expect(config.IS_DEV).toBe(true);
        expect(config.IS_PROD).toBe(false);
    });

    it("DEV_AUTH_BYPASS defaults to false", async () => {
        vi.stubEnv("NODE_ENV", "development");
        // Ensure DEV_AUTH_BYPASS is not set
        delete process.env.DEV_AUTH_BYPASS;

        vi.resetModules();
        const config = await import("./config.js");
        expect(config.DEV_AUTH_BYPASS).toBe(false);
    });

    it("DEV_AUTH_BYPASS is true when env is 'true'", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("DEV_AUTH_BYPASS", "true");

        vi.resetModules();
        const config = await import("./config.js");
        expect(config.DEV_AUTH_BYPASS).toBe(true);
    });
});
