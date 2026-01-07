import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import legalApp from "./legal.js";

describe("Legal Routes", () => {
    it("renders terms of service", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(legalApp);
        const res = await app.request("/terms", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Terms");
    });

    it("renders privacy policy", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(legalApp);
        const res = await app.request("/privacy", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Privacy");
    });
});
