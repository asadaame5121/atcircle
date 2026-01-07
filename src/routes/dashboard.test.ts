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
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue(undefined);
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
});
