import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import { AtProtoService } from "../services/atproto.js";
import uApp from "./u.js";

describe("User Profile Route", () => {
    beforeEach(() => {
        vi.spyOn(AtProtoService, "resolveHandle").mockResolvedValue(
            "did:plc:test",
        );
    });

    it("renders user profile", async () => {
        const env = {
            DB: createMockDB({
                all: [
                    {
                        title: "Site 1",
                        url: "https://site1.com",
                        description: "Desc",
                        ring_title: "Ring A",
                        ring_uri: "at://a",
                    },
                ],
            }),
        };
        const app = wrapApp(uApp);
        const res = await app.request("/test.bsky.social", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("test.bsky.social");
        expect(text).toContain("Site 1");
    });

    it("returns 404 for unknown user", async () => {
        vi.spyOn(AtProtoService, "resolveHandle").mockResolvedValue(null);
        const env = { DB: createMockDB({ all: [] }) };
        const app = wrapApp(uApp);
        const res = await app.request("/unknown.handle", {}, env);
        expect(res.status).toBe(404);
    });
});
