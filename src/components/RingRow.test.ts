import { describe, expect, it } from "vitest";
import ja from "../locales/ja.json";
import { RingRow } from "./RingRow.js";

const t = (key: string, options?: any) => {
    const value = key
        .split(".")
        .reduce<any>((acc, part) => (acc ? acc[part] : undefined), ja);
    if (typeof value !== "string") return key;
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        String(options?.[k] ?? ""),
    );
};

const render = (ring: any, opts: any = {}) =>
    String(
        RingRow({ ring: { title: "R", uri: "at://r", ...ring }, t, ...opts }),
    );

describe("RingRow", () => {
    it("acceptance_policy が manual なら承認制", () => {
        expect(render({ acceptance_policy: "manual" })).toContain("承認制");
    });

    it("automatic や未設定なら自動", () => {
        expect(render({ acceptance_policy: "automatic" })).toContain(">自動<");
        expect(render({})).toContain(">自動<");
    });

    it("href を渡すとリンク先を差し替え、選択中は aria-current と ▶ を付ける", () => {
        const html = render(
            {},
            { href: "/rings?select=at%3A%2F%2Fr#join", selected: true },
        );
        expect(html).toContain('href="/rings?select=at%3A%2F%2Fr#join"');
        expect(html).toContain('aria-current="true"');
        expect(html).toContain("▶");
    });
});
