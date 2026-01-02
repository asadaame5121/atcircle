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

    describe("getFollowers", () => {
        it("should fetch all followers by following cursors", async () => {
            const mockAgent = {
                api: {
                    app: {
                        bsky: {
                            graph: {
                                getFollowers: vi
                                    .fn()
                                    .mockResolvedValueOnce({
                                        data: {
                                            followers: [
                                                {
                                                    did: "did:plc:1",
                                                    handle: "u1.bsky.social",
                                                },
                                            ],
                                            cursor: "cursor-1",
                                        },
                                        success: true,
                                    })
                                    .mockResolvedValueOnce({
                                        data: {
                                            followers: [
                                                {
                                                    did: "did:plc:2",
                                                    handle: "u2.bsky.social",
                                                },
                                            ],
                                            cursor: undefined,
                                        },
                                        success: true,
                                    }),
                            },
                        },
                    },
                },
            } as any;

            const result = await AtProtoService.getFollowers(
                mockAgent,
                "test.bsky.social",
            );
            expect(result.followers).toHaveLength(2);
            expect(result.followers[0].handle).toBe("u1.bsky.social");
            expect(result.followers[1].handle).toBe("u2.bsky.social");
            expect(
                mockAgent.api.app.bsky.graph.getFollowers,
            ).toHaveBeenCalledTimes(2);
            // Verify first call
            expect(
                mockAgent.api.app.bsky.graph.getFollowers,
            ).toHaveBeenNthCalledWith(1, {
                actor: "test.bsky.social",
                cursor: undefined,
                limit: 100,
            });
            // Verify second call
            expect(
                mockAgent.api.app.bsky.graph.getFollowers,
            ).toHaveBeenNthCalledWith(2, {
                actor: "test.bsky.social",
                cursor: "cursor-1",
                limit: 100,
            });
        });
    });
});
