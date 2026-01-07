import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import antennaApp from "./antenna.js";

describe("Antenna Route", () => {
    it("renders antenna page", async () => {
        const env = {
            DB: createMockDB({
                all: [
                    {
                        item_title: "Feed 1",
                        item_url: "https://site1.com/rss/1",
                        published_at: Date.now(),
                        site_title: "Site 1",
                        site_url: "https://site1.com",
                    },
                ],
                first: { title: "Test Ring", uri: "at://test" },
            }),
        };
        const app = wrapApp(antennaApp);
        const res = await app.request("/?ring=at://test", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Test Ring");
        expect(text).toContain("Feed 1");
    });

    it("handles errors gracefully", async () => {
        const env = {
            DB: {
                prepare: () => {
                    throw new Error("DB Error");
                },
            } as any,
        };
        const res = await antennaApp.request("/?ring=at://test", {}, env);
        expect(res.status).toBe(500);
    });
});
