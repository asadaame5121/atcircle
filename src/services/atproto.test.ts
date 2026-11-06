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

    describe("updateRing", () => {
        const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";

        const agentWith = (existing: unknown) =>
            ({
                assertDid: "did:plc:owner",
                api: {
                    com: {
                        atproto: {
                            repo: {
                                getRecord: vi.fn(async () => ({
                                    data: {
                                        uri: RING,
                                        cid: "c",
                                        value: existing,
                                    },
                                })),
                                putRecord: vi.fn(async () => ({})),
                            },
                        },
                    },
                },
            }) as any;

        it("作成日時を保ったまま slug と bannerUrl も書き込む", async () => {
            const agent = agentWith({
                title: "Old",
                admin: "did:plc:owner",
                status: "open",
                createdAt: "2026-01-01T00:00:00.000Z",
            });

            await AtProtoService.updateRing(agent, RING, {
                title: "New",
                description: "desc",
                status: "closed",
                acceptancePolicy: "manual",
                admin: "did:plc:owner",
                slug: "my-ring",
                bannerUrl: "https://img.test/b.png",
            });

            const put = agent.api.com.atproto.repo.putRecord;
            expect(put).toHaveBeenCalledOnce();
            const { record, rkey, collection } = put.mock.calls[0][0];
            expect(rkey).toBe("3abc");
            expect(collection).toBe("net.asadaame5121.at-circle.ring");
            expect(record).toMatchObject({
                title: "New",
                status: "closed",
                acceptancePolicy: "manual",
                slug: "my-ring",
                bannerUrl: "https://img.test/b.png",
                createdAt: "2026-01-01T00:00:00.000Z",
            });
        });

        it("空の slug と bannerUrl はレコードから取り除く", async () => {
            const agent = agentWith({
                title: "Old",
                admin: "did:plc:owner",
                status: "open",
                slug: "old-slug",
                bannerUrl: "https://img.test/old.png",
                createdAt: "2026-01-01T00:00:00.000Z",
            });

            await AtProtoService.updateRing(agent, RING, {
                title: "New",
                description: "",
                status: "open",
                acceptancePolicy: "automatic",
                admin: "did:plc:owner",
                slug: null,
                bannerUrl: null,
            });

            const { record } =
                agent.api.com.atproto.repo.putRecord.mock.calls[0][0];
            expect(record).not.toHaveProperty("slug");
            expect(record).not.toHaveProperty("bannerUrl");
        });
    });
});
