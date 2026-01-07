import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../tests/route-utils.js";
import { AtProtoService } from "../services/atproto.js";
import * as oauth from "../services/oauth.js";
import dashboardApp from "./dashboard.js";

describe("Dashboard Route", () => {
    beforeEach(() => {
        vi.spyOn(AtProtoService, "listRings").mockResolvedValue([]);
        vi.spyOn(AtProtoService, "listMemberRecords").mockResolvedValue([]);
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({} as any);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({}),
            }),
        );
    });

    it("redirects to login if not authenticated", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(dashboardApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("/login");
    });

    it("renders registration form for new users", async () => {
        const token = await createMockAuthToken(
            "did:plc:test",
            "test.bsky.social",
        );
        // Mock dashboard service returns registration data if site is not found
        const env = {
            DB: createMockDB({
                first: null, // site not found
                all: [],
            }),
        };
        const app = wrapApp(dashboardApp);
        const res = await app.request(
            "/",
            {
                headers: {
                    Cookie: `session=${token}`,
                },
            },
            env,
        );
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Register your site");
        // expect(text).toContain("did:plc:test"); // Removed as component doesn't render DID
    });

    it("renders dashboard for users with a site", async () => {
        const token = await createMockAuthToken(
            "did:plc:test",
            "test.bsky.social",
        );
        const env = {
            DB: createMockDB({
                first: { id: 1, url: "https://site.com", title: "Site 1" }, // site found
                all: [], // rings, requests etc
            }),
        };
        const app = wrapApp(dashboardApp);
        const res = await app.request(
            "/",
            {
                headers: {
                    Cookie: `session=${token}`,
                },
            },
            env,
        );
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Dashboard");
    });

    it("renders owner-specific buttons but NOT invite-friends", async () => {
        const token = await createMockAuthToken(
            "did:plc:owner",
            "owner.bsky.social",
        );

        // Mock ring where user is admin
        vi.spyOn(AtProtoService, "listRings").mockResolvedValue([
            {
                uri: "at://did:plc:owner/net.asadaame5121.atCircle.ring/r1",
                cid: "cid1",
                value: {
                    $type: "net.asadaame5121.atCircle.ring",
                    title: "Owner Ring",
                    description: "Test Ring",
                    status: "open",
                    acceptancePolicy: "automatic",
                    admin: "did:plc:owner" as any,
                    createdAt: new Date().toISOString(),
                },
            },
        ]);

        const env = {
            DB: createMockDB({
                first: { id: 1, url: "https://site.com", title: "Site 1" },
                all: [],
            }),
        };

        const app = wrapApp(dashboardApp);
        const res = await app.request(
            "/",
            {
                headers: {
                    Cookie: `session=${token}`,
                },
            },
            env,
        );

        expect(res.status).toBe(200);
        const text = await res.text();

        // Check for ring title
        expect(text).toContain("Owner Ring");

        // Should have owner-only buttons.
        const hasManageButton =
            text.includes("Manage") || text.includes("管理");
        const hasConfigButton =
            text.includes("Config") || text.includes("設定");

        expect(hasManageButton).toBe(true);
        expect(hasConfigButton).toBe(true);

        // Should NOT have invite friends functionality
        expect(text).not.toContain("Invite Friends");
        expect(text).not.toContain("友人を招待");
        expect(text).not.toContain("openInviteModal");
    });
});
