import { describe, expect, it } from "bun:test";
import { Auth, validateHandle } from "./auth";

describe("Auth Validation", () => {
    it("should validate a correct handle", () => {
        const result = validateHandle("example.bsky.social");
        expect(result.success).toBe(true);
    });

    it("should reject a handle with invalid characters", () => {
        const result = validateHandle("invalid_handle!");
        expect(result.success).toBe(false);
        if (!result.success) {
            // expect(result.error.errors[0].message).toContain('letters, numbers, hyphens, and dots');
        }
    });

    it("should reject a handle starting with a dot", () => {
        const result = validateHandle(".invalid");
        expect(result.success).toBe(false);
    });

    it("should reject a handle with consecutive dots", () => {
        const result = validateHandle("invalid..handle");
        expect(result.success).toBe(false);
    });

    it("should reject a handle that is too short", () => {
        const result = validateHandle("ab");
        expect(result.success).toBe(false);
    });
});

describe("Auth Flow (Mock)", () => {
    it("should initiate login with valid handle", async () => {
        const result = await Auth.initiateLogin("user.bsky.social");
        expect(result.valid).toBe(true);
        expect(result.authUrl).toContain("user.bsky.social");
    });

    it("should throw error on invalid handle", async () => {
        await expect(Auth.initiateLogin("invalid!")).rejects.toThrow();
    });
});
