import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import rApp from "./r.js";

describe("Short URL Proxy Route", () => {
    it("redirects slug to ring view", async () => {
        const env = {
            DB: createMockDB({
                first: { uri: "at://test-uri" },
            }),
        };
        const app = wrapApp(rApp);
        const res = await app.request("/test-slug", {}, env);
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain(
            "/rings/view?ring=at%3A%2F%2Ftest-uri",
        );
    });

    it("returns 404 for unknown slug", async () => {
        const env = { DB: createMockDB({ first: null }) };
        const app = wrapApp(rApp);
        const res = await app.request("/unknown-slug", {}, env);
        expect(res.status).toBe(404);
    });
});
