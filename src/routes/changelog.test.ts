import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import changelogApp from "./changelog.js";

describe("Changelog Route", () => {
    it("renders changelog page in Japanese", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(changelogApp);
        const res = await app.request("/changelog?lang=ja", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("更新履歴");
        expect(text).toContain("Companion");
    });

    it("renders changelog page in English", async () => {
        const env = { DB: createMockDB() };
        const app = wrapApp(changelogApp);
        const res = await app.request("/changelog?lang=en", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Changelog");
        expect(text).toContain("Companion");
    });
});
