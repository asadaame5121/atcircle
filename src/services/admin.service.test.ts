import { describe, expect, it, vi } from "vitest";
import { AdminService } from "./admin.service.js";
import { restoreAgent } from "./oauth.js";

// Mock dependencies
vi.mock("./atproto.js");
vi.mock("./oauth.js");

const createMockDB = (data: any = {}) => {
    return {
        prepare: vi.fn().mockImplementation((_query: string) => {
            return {
                bind: vi.fn().mockImplementation((..._args: any[]) => {
                    return {
                        first: vi
                            .fn()
                            .mockImplementation(async () => data.first),
                        all: vi.fn().mockImplementation(async () => ({
                            results: data.all || [],
                        })),
                        run: vi.fn().mockImplementation(async () => ({
                            success: true,
                        })),
                    };
                }),
                first: vi.fn().mockImplementation(async () => data.first),
                all: vi.fn().mockImplementation(async () => ({
                    results: data.all || [],
                })),
                run: vi.fn().mockImplementation(async () => ({
                    success: true,
                })),
            };
        }),
    };
};

describe("AdminService", () => {
    describe("syncAllUsersData", () => {
        it("should iterate through all users and call syncUserData", async () => {
            const db = createMockDB({
                all: [{ did: "did:user1" }, { did: "did:user2" }],
            });
            const mockAgent = { assertDid: "did:user1" };

            vi.mocked(restoreAgent).mockResolvedValue(mockAgent as any);

            // We want to verify syncUserData is called.
            // Since AdminService is an object, we can spy on its methods.
            const syncSpy = vi
                .spyOn(AdminService, "syncUserData")
                .mockResolvedValue(undefined);

            const result = await AdminService.syncAllUsersData(db as any);

            expect(result.processed).toBe(2);
            expect(syncSpy).toHaveBeenCalledTimes(2);
            expect(restoreAgent).toHaveBeenCalledWith(
                db,
                expect.any(String),
                "did:user1",
            );
            expect(restoreAgent).toHaveBeenCalledWith(
                db,
                expect.any(String),
                "did:user2",
            );
        });

        it("should handle individual sync errors and continue", async () => {
            const db = createMockDB({
                all: [{ did: "did:user1" }, { did: "did:user2" }],
            });
            vi.mocked(restoreAgent).mockResolvedValueOnce(null); // Fail first
            vi.mocked(restoreAgent).mockResolvedValueOnce({} as any); // Success second

            const syncSpy = vi
                .spyOn(AdminService, "syncUserData")
                .mockResolvedValue(undefined);

            const result = await AdminService.syncAllUsersData(db as any);

            expect(result.processed).toBe(1);
            expect(result.errors).toBe(1);
            expect(syncSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("removeUser", () => {
        it("should perform a clean deletion of user and related records", async () => {
            const _db = createMockDB({
                all: [{ id: 1 }, { uri: "at://ring1" }], // returns both sites and rings in different calls...
                // Wait, mockDB simplification might need more care for multiple queries.
            });

            // To be more precise, we can mock based on query content
            const mockPrepare = vi.fn().mockImplementation((query: string) => {
                let results: any[] = [];
                if (query.includes("FROM sites")) results = [{ id: 1 }];
                if (query.includes("FROM rings")) {
                    results = [{ uri: "at://ring1" }];
                }

                return {
                    bind: vi.fn().mockReturnThis(),
                    all: vi.fn().mockResolvedValue({ results }),
                    run: vi.fn().mockResolvedValue({ success: true }),
                    first: vi.fn().mockResolvedValue(null),
                };
            });
            const complexDb = { prepare: mockPrepare };

            const result = await AdminService.removeUser(
                complexDb as any,
                "did:target",
            );

            expect(result.success).toBe(true);
            // Verify deletion order or at least that key deletions were called
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM antenna_items"),
            );
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM memberships"),
            );
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM sites"),
            );
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM rings"),
            );
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM users"),
            );
        });
    });
});
