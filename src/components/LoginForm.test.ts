import { describe, expect, it } from "vitest";
import ja from "../locales/ja.json";
import { filterHandleSuggestions, LoginForm } from "./LoginForm.js";

const t = (key: string) => {
    const value = key
        .split(".")
        .reduce<any>((acc, part) => (acc ? acc[part] : undefined), ja);
    return typeof value === "string" ? value : key;
};

describe("filterHandleSuggestions（ハンドル候補の前方一致）", () => {
    const actors = [
        { handle: "asahi.example.com", displayName: "あさひ" },
        { handle: "asagao.example.net" },
        { handle: "mika.example.net", displayName: "みか" },
        { handle: "asa", displayName: "完全一致" },
    ];

    it("入力で始まるハンドルだけを返し、完全一致は除く", () => {
        expect(
            filterHandleSuggestions(actors, "asa").map((a) => a.handle),
        ).toEqual(["asahi.example.com", "asagao.example.net"]);
    });

    it("先頭の @ と前後の空白、大文字小文字を無視する", () => {
        expect(
            filterHandleSuggestions(actors, "  @ASAH ").map((a) => a.handle),
        ).toEqual(["asahi.example.com"]);
    });

    it("空の入力では何も返さない", () => {
        expect(filterHandleSuggestions(actors, " ")).toEqual([]);
    });

    it("最大5件まで", () => {
        const many = Array.from({ length: 8 }, (_, i) => ({
            handle: `asa${i}.example.com`,
        }));
        expect(filterHandleSuggestions(many, "asa")).toHaveLength(5);
    });
});

describe("LoginForm", () => {
    const render = (next?: string) => String(LoginForm({ t, next }));

    it("/auth/login に handle を POST するフォームを出す", () => {
        const html = render();
        expect(html).toContain('action="/auth/login"');
        expect(html).toContain('method="POST"');
        expect(html).toMatch(/<input[^>]*name="handle"[^>]*required/);
        expect(html).toContain("Atproto ハンドル");
        expect(html).toContain("ログイン ≫");
    });

    it("入力欄はコンボボックスとして候補リストと結びつく", () => {
        const html = render();
        expect(html).toContain('role="combobox"');
        expect(html).toContain('aria-controls="handle-suggestions"');
        expect(html).toContain('aria-expanded="false"');
        expect(html).toMatch(
            /<ul id="handle-suggestions" role="listbox"[^>]*hidden/,
        );
        expect(html).toContain("public.api.bsky.app");
    });

    it("next があれば hidden で渡し、属性値をエスケープする", () => {
        const html = render('/page?q="x"');
        expect(html).toContain('name="next" value="/page?q=&quot;x&quot;"');
    });

    it("next がなければ hidden を出さない", () => {
        expect(render()).not.toContain('name="next"');
    });
});
