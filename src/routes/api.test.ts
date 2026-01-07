import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import apiApp from "./api.js";

describe("API Route", () => {
    it("returns ring info and members in JSON", async () => {
        const env = {
            DB: createMockDB({
                first: {
                    uri: "at://test",
                    title: "Test Ring",
                    description: "Desc",
                    created_at: "2024-01-01",
                },
                all: [{ title: "Member 1", url: "https://site1.com" }],
            }),
        };
        const app = wrapApp(apiApp);
        const res = await app.request(
            `/rings/${encodeURIComponent("at://test")}`,
            {},
            env,
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.title).toBe("Test Ring");
        expect(json.members).toHaveLength(1);
        expect(json.members[0].title).toBe("Member 1");
    });

    it("returns 404 for unknown ring", async () => {
        const env = { DB: createMockDB({ first: null }) };
        const res = await apiApp.request("/rings/at://unknown", {}, env);
        expect(res.status).toBe(404);
    });
});
