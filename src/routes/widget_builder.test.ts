import { describe, expect, it } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../tests/route-utils.js";
import widgetApp from "./widget_builder.js";

describe("Widget Builder Route", () => {
    it("redirects to login if not authenticated", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(widgetApp);
        const res = await app.request("/?ring_uri=at://test", {}, env);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("/login");
    });

    it("renders widget builder for authenticated users", async () => {
        const token = await createMockAuthToken(
            "did:plc:test",
            "test.bsky.social",
        );
        const env = {
            DB: createMockDB({
                first: {
                    title: "Test Ring",
                    banner_url: "https://example.com/banner.png",
                    url: "https://site.com",
                    owner_did: "did:plc:test",
                },
                all: [], // For memberships check if needed
            }),
        };
        const app = wrapApp(widgetApp);
        const res = await app.request(
            "/?ring_uri=at://test",
            {
                headers: {
                    Cookie: `session=${token}`,
                },
            },
            env,
        );
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Widget for Test Ring");
        expect(text).toContain("Test Ring");
    });

    it("saves widget settings", async () => {
        const token = await createMockAuthToken(
            "did:plc:test",
            "test.bsky.social",
        );
        const env = {
            DB: createMockDB({
                first: {
                    id: 1,
                    site_id: 1,
                    ring_uri: "at://test",
                    owner_did: "did:plc:test",
                }, // mock membership
            }),
        };
        const app = wrapApp(widgetApp);
        const res = await app.request(
            "/save-settings",
            {
                method: "POST",
                headers: {
                    Cookie: `session=${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ring_uri: "at://test",
                    banner_url: "https://custom.com/banner.png",
                }),
            },
            env,
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });
});
