import { describe, expect, it } from "vitest";
import { createSecretBox } from "./secret-box";

describe("secret box", () => {
    const box = createSecretBox("test-secret");

    it("round-trips and does not leak plaintext", () => {
        const sealed = box.seal('{"refresh_token":"abc"}');
        expect(sealed).not.toContain("refresh_token");
        expect(box.isSealed(sealed)).toBe(true);
        expect(box.open(sealed)).toBe('{"refresh_token":"abc"}');
    });

    it("uses a fresh IV each time", () => {
        expect(box.seal("x")).not.toBe(box.seal("x"));
    });

    it("passes through legacy plaintext values", () => {
        expect(box.open('{"a":1}')).toBe('{"a":1}');
    });

    it("rejects tampered values and wrong keys", () => {
        const sealed = box.seal("secret");
        // 中ほどの 1 文字を必ず別の文字に変える。末尾の文字は base64url の
        // 未使用ビットを含み、変えてもデコード結果が同じことがあるので避ける
        const i = Math.floor(sealed.length / 2);
        const tampered = `${sealed.slice(0, i)}${sealed[i] === "A" ? "B" : "A"}${sealed.slice(i + 1)}`;
        expect(() => box.open(tampered)).toThrow();
        expect(() => createSecretBox("other").open(sealed)).toThrow();
    });
});
