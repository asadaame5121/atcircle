import { describe, expect, it, vi } from "vitest";
import { AtProtoService } from "./atproto";

describe("AtProtoService", () => {
    describe("getProfile", () => {
        it("should fetch a profile", async () => {
            const mockAgent = {
                getProfile: vi.fn().mockResolvedValue({
                    data: {
                        did: "did:plc:test",
                        handle: "test.bsky.social",
                        displayName: "Test User",
                    },
                    success: true,
                }),
            } as any;

            const profile = await AtProtoService.getProfile(
                mockAgent,
                "test.bsky.social",
            );
            expect(profile.handle).toBe("test.bsky.social");
            expect(profile.displayName).toBe("Test User");
            expect(mockAgent.getProfile).toHaveBeenCalledWith({
                actor: "test.bsky.social",
            });
        });
    });
});
