import { describe, expect, it, vi } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";

vi.mock("../../services/atproto.js", () => ({
    AtProtoService: {
        getProfilesPublic: vi.fn(async () => ({ profiles: [] })),
    },
}));

import homeApp from "./home.js";

describe("Home Route", () => {
    it("renders home page for guests", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(homeApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("AT CIRCLE");
        expect(text).toContain("/login");
        expect(text).toContain("/rings");
    });

    it("shows public ring preview when rings exist", async () => {
        const env = {
            DB: createMockDB({
                all: [
                    {
                        id: 1,
                        title: "Preview Ring",
                        uri: "at://test",
                        owner_did: "did:plc:test",
                        member_count: 3,
                    },
                ],
            }),
        };
        const app = wrapApp(homeApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Preview Ring");
        expect(text).toContain("/rings/view?ring=at%3A%2F%2Ftest");
    });

    it("hides ring preview section when there are no rings", async () => {
        const env = { DB: createMockDB({ all: [] }) };
        const app = wrapApp(homeApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).not.toContain("preview_rings_title");
    });

    it("redirects to dashboard for logged in users", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(homeApp);
        const res = await app.request(
            "/",
            {
                headers: {
                    Cookie: "session=mock-token",
                },
            },
            env,
        );
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toBe("/dashboard");
    });
});
