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

    describe("decision レコード", () => {
        const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";
        const SUBJECT = {
            uri: "at://did:plc:alice/net.asadaame5121.at-circle.request/1",
            cid: "bafysubject",
        };

        const repoAgent = (records: unknown[] = []) => {
            const repo = {
                createRecord: vi.fn(async () => ({
                    data: { uri: "at://did:plc:owner/x/1", cid: "c" },
                })),
                listRecords: vi.fn(async () => ({
                    data: { records, cursor: undefined },
                })),
                deleteRecord: vi.fn(async () => ({})),
            };
            return {
                agent: {
                    assertDid: "did:plc:owner",
                    api: { com: { atproto: { repo } } },
                } as any,
                repo,
            };
        };

        it("putDecision は自分のリポジトリに decision を作る", async () => {
            const { agent, repo } = repoAgent();
            await AtProtoService.putDecision(agent, RING, SUBJECT, "approved");

            const arg = repo.createRecord.mock.calls[0][0];
            expect(arg.repo).toBe("did:plc:owner");
            expect(arg.collection).toBe("net.asadaame5121.at-circle.decision");
            expect(arg.record).toMatchObject({
                $type: "net.asadaame5121.at-circle.decision",
                ring: { uri: RING },
                subject: SUBJECT,
                status: "approved",
            });
            expect(typeof arg.record.createdAt).toBe("string");
        });

        it("deleteDecisions は対象とリングが一致する自分の decision だけ消す", async () => {
            const { agent, repo } = repoAgent([
                {
                    uri: "at://did:plc:owner/net.asadaame5121.at-circle.decision/a",
                    value: { ring: { uri: RING }, subject: SUBJECT },
                },
                {
                    uri: "at://did:plc:owner/net.asadaame5121.at-circle.decision/b",
                    value: {
                        ring: { uri: RING },
                        subject: { uri: "at://other/x/1", cid: "c" },
                    },
                },
            ]);

            const removed = await AtProtoService.deleteDecisions(
                agent,
                RING,
                SUBJECT.uri,
            );

            expect(removed).toBe(1);
            expect(repo.deleteRecord).toHaveBeenCalledOnce();
            expect(repo.deleteRecord.mock.calls[0][0]).toMatchObject({
                repo: "did:plc:owner",
                collection: "net.asadaame5121.at-circle.decision",
                rkey: "a",
            });
        });
    });

    describe("leaveRing", () => {
        const agentWithDelete = () => {
            const deleteRecord = vi.fn(async () => ({}));
            return {
                agent: {
                    assertDid: "did:plc:me",
                    api: { com: { atproto: { repo: { deleteRecord } } } },
                } as any,
                deleteRecord,
            };
        };

        it("申請レコード (request) で参加していた場合はそれを消す", async () => {
            const { agent, deleteRecord } = agentWithDelete();
            await AtProtoService.leaveRing(
                agent,
                "at://did:plc:me/net.asadaame5121.at-circle.request/3req",
            );
            expect(deleteRecord).toHaveBeenCalledWith({
                repo: "did:plc:me",
                collection: "net.asadaame5121.at-circle.request",
                rkey: "3req",
            });
        });

        it("メンバーレコードはそのまま消す", async () => {
            const { agent, deleteRecord } = agentWithDelete();
            await AtProtoService.leaveRing(
                agent,
                "at://did:plc:me/net.asadaame5121.at-circle.member/3mem",
            );
            expect(deleteRecord.mock.calls[0][0].collection).toBe(
                "net.asadaame5121.at-circle.member",
            );
        });

        it("参加レコード以外や他人のレコードは消さない", async () => {
            const { agent, deleteRecord } = agentWithDelete();
            await expect(
                AtProtoService.leaveRing(
                    agent,
                    "at://did:plc:me/net.asadaame5121.at-circle.ring/3ring",
                ),
            ).rejects.toThrow();
            await expect(
                AtProtoService.leaveRing(
                    agent,
                    "at://did:plc:other/net.asadaame5121.at-circle.member/1",
                ),
            ).rejects.toThrow();
            expect(deleteRecord).not.toHaveBeenCalled();
        });
    });
});
