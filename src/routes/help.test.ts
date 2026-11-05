import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import helpApp from "./help.js";

describe("Help Route", () => {
    it("renders help page in Japanese", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(helpApp);
        const res = await app.request("/help?lang=ja", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("ヘルプ");
        expect(text).toContain("はじめての使い方");
        expect(text).toContain("Companion");
    });

    it("renders help page in English", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(helpApp);
        const res = await app.request("/help?lang=en", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Help");
        expect(text).toContain("Getting Started");
        expect(text).toContain("Companion");
    });
});
