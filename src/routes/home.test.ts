import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
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
