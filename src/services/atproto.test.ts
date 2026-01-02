import { describe, expect, it, vi } from "vitest";
import { AtProtoService } from "./atproto";

describe("AtProtoService", () => {
    describe("getProfile", () => {
        it("should fetch a profile", async () => {
            const mockAgent = {
                api: {
                    app: {
                        bsky: {
                            actor: {
                                getProfile: vi.fn().mockResolvedValue({
                                    data: {
                                        did: "did:plc:test",
                                        handle: "test.bsky.social",
                                        displayName: "Test User",
                                    },
                                    success: true,
                                }),
                            },
                        },
                    },
                },
            } as any;

            const profile = await AtProtoService.getProfile(
                mockAgent,
                "test.bsky.social",
            );
            expect(profile.handle).toBe("test.bsky.social");
            expect(profile.displayName).toBe("Test User");
            expect(
                mockAgent.api.app.bsky.actor.getProfile,
            ).toHaveBeenCalledWith({ actor: "test.bsky.social" });
        });
    });

    describe("getFollows", () => {
        it("should fetch follows", async () => {
            const mockAgent = {
                api: {
                    app: {
                        bsky: {
                            graph: {
                                getFollows: vi.fn().mockResolvedValue({
                                    data: {
                                        follows: [
                                            {
                                                did: "did:plc:1",
                                                handle: "u1.bsky.social",
                                            },
                                            {
                                                did: "did:plc:2",
                                                handle: "u2.bsky.social",
                                            },
                                        ],
                                        cursor: "next-cursor",
                                    },
                                    success: true,
                                }),
                            },
                        },
                    },
                },
            } as any;

            const result = await AtProtoService.getFollows(
                mockAgent,
                "test.bsky.social",
                undefined,
                50,
            );
            expect(result.follows).toHaveLength(2);
            expect(result.follows[0].handle).toBe("u1.bsky.social");
            expect(result.cursor).toBe("next-cursor");
            expect(
                mockAgent.api.app.bsky.graph.getFollows,
            ).toHaveBeenCalledWith({
                actor: "test.bsky.social",
                cursor: undefined,
                limit: 50,
            });
        });
    });
});
