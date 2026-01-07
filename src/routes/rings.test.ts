import { describe, expect, it } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import ringsApp from "./rings.js";

describe("Rings Route", () => {
    it("renders ring list", async () => {
        const env = {
            DB: createMockDB({
                all: [
                    {
                        id: 1,
                        title: "Test Ring",
                        uri: "at://test",
                        member_count: 5,
                    },
                ],
            }),
        };
        const app = wrapApp(ringsApp);
        const res = await app.request("/", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Test Ring");
    });

    it("renders ring detail view", async () => {
        const env = {
            DB: createMockDB({
                first: { id: 1, title: "Test Ring", uri: "at://test" },
                all: [{ title: "Member 1", url: "https://site1.com" }],
            }),
        };
        const app = wrapApp(ringsApp);
        const res = await app.request("/view?ring=at://test", {}, env);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Test Ring");
        expect(text).toContain("Member 1");
    });

    it("exports OPML", async () => {
        const env = {
            DB: createMockDB({
                first: { title: "Test Ring" },
                all: [
                    {
                        title: "Member 1",
                        url: "https://site1.com",
                        rss_url: "https://site1.com/rss",
                    },
                ],
            }),
        };
        const res = await ringsApp.request("/opml?ring=at://test", {}, env);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/x-opml+xml");
        const body = await res.text();
        expect(body).toContain("<opml");
        expect(body).toContain('title="Member 1"');
    });
});
