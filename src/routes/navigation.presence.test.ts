import { beforeEach, describe, expect, it, vi } from "vitest";

const markWidgetSeen = vi.fn(async () => true);
vi.mock("../services/widget-presence.js", () => ({ markWidgetSeen }));
vi.mock("../services/navigation.service.js", () => ({
    NavigationService: class {
        getNextSite = async () => "https://next.example/";
        getPrevSite = async () => "https://prev.example/";
        getRandomSite = async () => "https://random.example/";
    },
}));

const { default: navigationApp } = await import("./navigation.js");
const { generateWidgetScript } = await import(
    "../components/NavigationWidget.js"
);

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/r1";
const env = { DB: {} as any };

describe("ウィジェット設置の検知", () => {
    beforeEach(() => markWidgetSeen.mockClear());

    it("/ping はリングとサイトを記録し、どこからでも呼べる 204 を返す", async () => {
        const res = await navigationApp.request(
            `/ping?ring=${encodeURIComponent(RING)}&site=${encodeURIComponent("https://alice.example/post")}`,
            { headers: { Origin: "https://alice.example" } },
            env,
        );
        expect(res.status).toBe(204);
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(res.headers.get("Cache-Control")).toContain("no-store");
        expect(markWidgetSeen).toHaveBeenCalledWith(
            env.DB,
            RING,
            "https://alice.example/post",
        );
    });

    it("/ping はパラメータが足りなければ記録しない", async () => {
        const res = await navigationApp.request("/ping?ring=x", {}, env);
        expect(res.status).toBe(204);
        expect(markWidgetSeen).not.toHaveBeenCalled();
    });

    it("/ping は記録に失敗しても 204 を返す", async () => {
        markWidgetSeen.mockRejectedValueOnce(new Error("db down"));
        const res = await navigationApp.request(
            `/ping?ring=${encodeURIComponent(RING)}&site=https://alice.example/`,
            {},
            env,
        );
        expect(res.status).toBe(204);
    });

    it("前へ・次へが押されたら、押された元のサイト（from）を記録する", async () => {
        for (const path of ["/next", "/prev"]) {
            markWidgetSeen.mockClear();
            const res = await navigationApp.request(
                `${path}?ring=${encodeURIComponent(RING)}&from=${encodeURIComponent("https://alice.example/")}`,
                {},
                env,
            );
            expect(res.status).toBe(302);
            expect(markWidgetSeen).toHaveBeenCalledWith(
                env.DB,
                RING,
                "https://alice.example/",
            );
        }
    });

    it("widget.js は表示時に /nav/ping へ知らせる（見た目は変えない）", () => {
        const script = generateWidgetScript("https://at-circle.example");
        expect(script).toContain("https://at-circle.example/nav/ping?ring=");
        expect(script).toContain('getAttribute("site")');
        expect(script).toContain("no-referrer");
    });
});
