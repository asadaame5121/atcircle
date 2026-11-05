import { describe, expect, it } from "vitest";
import { jsonForScript, safeHref } from "./html";

describe("jsonForScript", () => {
    it("cannot close the surrounding script element", () => {
        const out = jsonForScript({ t: "</script><script>alert(1)</script>" });
        expect(out).not.toContain("</script");
        expect(out).not.toContain("<");
        // Still evaluates to the original value
        expect(new Function(`return ${out}`)()).toEqual({
            t: "</script><script>alert(1)</script>",
        });
    });
});

describe("safeHref", () => {
    it("only allows http(s)", () => {
        expect(safeHref("https://a.test/")).toBe("https://a.test/");
        expect(safeHref("javascript:alert(1)")).toBe("#");
        expect(safeHref("data:text/html,x", "")).toBe("");
    });
});
