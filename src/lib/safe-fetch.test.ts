import { afterEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "./safe-fetch";

describe("safeFetch", () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it.each([
        "http://127.0.0.1/",
        "http://10.0.0.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "file:///etc/passwd",
        "https://example.net:8443/",
    ])("rejects %s", async (url) => {
        globalThis.fetch = vi.fn(async () => new Response("ok"));
        await expect(safeFetch(url)).rejects.toThrow();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("re-validates redirect targets", async () => {
        globalThis.fetch = vi.fn(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: "http://127.0.0.1/admin" },
                }),
        );
        await expect(safeFetch("https://site.test/")).rejects.toThrow();
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("follows safe redirects", async () => {
        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 301,
                    headers: { location: "/moved" },
                }),
            )
            .mockResolvedValueOnce(new Response("done", { status: 200 }));
        const res = await safeFetch("https://site.test/");
        expect(await res.text()).toBe("done");
        const second = (globalThis.fetch as any).mock.calls[1][0] as Request;
        expect(second.url).toBe("https://site.test/moved");
    });
});
