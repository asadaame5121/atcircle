import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    isValidWebUrl,
    type NavigationMember,
    type NavigationSession,
    NavigationSessionManager,
    sanitizeExternalUrl,
} from "./navigation-session.js";

describe("NavigationSession & Security Utilities", () => {
    describe("URL Validation & Sanitization", () => {
        it("accepts valid https and http URLs", () => {
            expect(isValidWebUrl("https://example.com")).toBe(true);
            expect(isValidWebUrl("http://example.org/path?query=1#hash")).toBe(
                true,
            );
            expect(isValidWebUrl("http://localhost:3000")).toBe(true);
        });

        it("rejects unsafe or invalid schemes", () => {
            expect(isValidWebUrl("javascript:alert(1)")).toBe(false);
            expect(
                isValidWebUrl("data:text/html,<script>alert(1)</script>"),
            ).toBe(false);
            expect(isValidWebUrl("file:///etc/passwd")).toBe(false);
            expect(isValidWebUrl("ftp://example.com")).toBe(false);
            expect(isValidWebUrl("")).toBe(false);
            expect(isValidWebUrl("not-a-url")).toBe(false);
        });

        it("sanitizes URLs by trimming and validating", () => {
            expect(sanitizeExternalUrl("  https://example.com/blog  ")).toBe(
                "https://example.com/blog",
            );
            expect(sanitizeExternalUrl("javascript:void(0)")).toBeNull();
        });
    });

    describe("NavigationSessionManager", () => {
        let manager: NavigationSessionManager;
        let mockStorage: Record<string, string>;
        const ringUri = "at://did:plc:123/net.asadaame5121.at-circle.ring/abc";

        const members: NavigationMember[] = [
            {
                uri: "at://did:plc:user1/net.asadaame5121.at-circle.member/m1",
                url: "https://user1.example.com",
                title: "User One Site",
                description: "Site 1 description",
                rssUrl: "https://user1.example.com/rss.xml",
            },
            {
                uri: "at://did:plc:user2/net.asadaame5121.at-circle.member/m2",
                url: "https://user2.example.com",
                title: "User Two Site",
                description: "Site 2 description",
                rssUrl: null,
            },
            {
                uri: "at://did:plc:user3/net.asadaame5121.at-circle.member/m3",
                url: "https://user3.example.com",
                title: "User Three Site",
                description: "Site 3 description",
                rssUrl: null,
            },
        ];

        beforeEach(() => {
            mockStorage = {};
            const storageShim = {
                getItem: vi.fn((key: string) => mockStorage[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    mockStorage[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete mockStorage[key];
                }),
                clear: vi.fn(() => {
                    mockStorage = {};
                }),
            };
            manager = new NavigationSessionManager(
                storageShim as unknown as Storage,
            );
        });

        describe("Session Initialization & Persistence", () => {
            it("initializes a new session when none exists", () => {
                const session = manager.initSession(ringUri, members);
                expect(session.ringUri).toBe(ringUri);
                expect(session.currentMemberUri).toBe(members[0].uri);
                expect(session.history).toEqual([members[0].uri]);
                expect(session.historyIndex).toBe(0);
            });

            it("initializes session with specific initial member if provided", () => {
                const session = manager.initSession(
                    ringUri,
                    members,
                    members[1].uri,
                );
                expect(session.currentMemberUri).toBe(members[1].uri);
                expect(session.history).toEqual([members[1].uri]);
                expect(session.historyIndex).toBe(0);
            });

            it("loads saved session from storage", () => {
                const session = manager.initSession(ringUri, members);
                const loaded = manager.loadSession(ringUri);
                expect(loaded).toEqual(session);
            });

            it("clears session from storage", () => {
                manager.initSession(ringUri, members);
                expect(manager.loadSession(ringUri)).not.toBeNull();
                manager.clearSession(ringUri);
                expect(manager.loadSession(ringUri)).toBeNull();
            });
        });

        describe("Navigation Semantics (Next, Previous, Random)", () => {
            it("advances to next member in ring order (Next)", () => {
                let session = manager.initSession(ringUri, members); // at user1
                session = manager.next(session, members);
                expect(session.currentMemberUri).toBe(members[1].uri);
                expect(session.history).toEqual([
                    members[0].uri,
                    members[1].uri,
                ]);
                expect(session.historyIndex).toBe(1);

                session = manager.next(session, members);
                expect(session.currentMemberUri).toBe(members[2].uri);
                expect(session.history).toEqual([
                    members[0].uri,
                    members[1].uri,
                    members[2].uri,
                ]);
                expect(session.historyIndex).toBe(2);
            });

            it("wraps around to first member after reaching end of ring (Next)", () => {
                let session = manager.initSession(
                    ringUri,
                    members,
                    members[2].uri,
                ); // at user3
                session = manager.next(session, members);
                expect(session.currentMemberUri).toBe(members[0].uri);
                expect(session.history).toEqual([
                    members[2].uri,
                    members[0].uri,
                ]);
                expect(session.historyIndex).toBe(1);
            });

            it("navigates back through visited history, not ring order (Previous)", () => {
                let session = manager.initSession(ringUri, members); // user1
                session = manager.next(session, members); // user2
                session = manager.next(session, members); // user3

                expect(session.historyIndex).toBe(2);
                expect(session.currentMemberUri).toBe(members[2].uri);

                // Previous should go to user2
                session = manager.prev(session);
                expect(session.currentMemberUri).toBe(members[1].uri);
                expect(session.historyIndex).toBe(1);

                // Previous again should go to user1
                session = manager.prev(session);
                expect(session.currentMemberUri).toBe(members[0].uri);
                expect(session.historyIndex).toBe(0);

                // Previous at start of history stays at start
                session = manager.prev(session);
                expect(session.currentMemberUri).toBe(members[0].uri);
                expect(session.historyIndex).toBe(0);
            });

            it("selects a random member and appends to history (Random)", () => {
                let session = manager.initSession(ringUri, members); // user1
                const randomSpy = vi
                    .spyOn(Math, "random")
                    .mockReturnValue(0.99);

                session = manager.random(session, members);
                expect(session.currentMemberUri).not.toBe(members[0].uri);
                expect(session.history.length).toBe(2);
                expect(session.historyIndex).toBe(1);

                randomSpy.mockRestore();
            });

            it("handles manual member selection by truncating future history if in middle", () => {
                let session = manager.initSession(ringUri, members); // user1
                session = manager.next(session, members); // user2
                session = manager.next(session, members); // user3
                session = manager.prev(session); // back at user2 (index 1 of [user1, user2, user3])

                // Manually select user1
                session = manager.selectMember(session, members[0].uri);
                expect(session.currentMemberUri).toBe(members[0].uri);
                expect(session.history).toEqual([
                    members[0].uri,
                    members[1].uri,
                    members[0].uri,
                ]);
                expect(session.historyIndex).toBe(2);
            });
        });

        describe("Error and Edge Case Handling", () => {
            it("handles empty member list gracefully", () => {
                const session = manager.initSession(ringUri, []);
                expect(session.currentMemberUri).toBeNull();
                expect(session.history).toEqual([]);

                const nextSession = manager.next(session, []);
                expect(nextSession.currentMemberUri).toBeNull();

                const randSession = manager.random(session, []);
                expect(randSession.currentMemberUri).toBeNull();
            });

            it("handles member missing from list during lookup", () => {
                const session: NavigationSession = {
                    ringUri,
                    currentMemberUri: "at://deleted/member",
                    history: ["at://deleted/member"],
                    historyIndex: 0,
                    updatedAt: new Date().toISOString(),
                };
                const current = manager.getCurrentMember(session, members);
                expect(current).toBeNull();
            });
        });
    });
});
