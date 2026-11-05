import { afterEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "./safe-fetch";

describe("safeFetch", () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    // Real fetch: these are rejected by the connect-time guard before any
    // connection is attempted, so no network access is needed.
    it.each([
        "http://127.0.0.1/",
        "http://10.0.0.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "http://localhost/",
    ])("rejects private/loopback target %s", async (url) => {
        await expect(safeFetch(url)).rejects.toThrow();
    });

    it.each([
        "file:///etc/passwd",
        "https://site.test:8443/",
    ])("rejects disallowed URL %s without calling fetch", async (url) => {
        globalThis.fetch = vi.fn(async () => new Response("ok"));
        await expect(safeFetch(url)).rejects.toThrow();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("rejects redirects to disallowed schemes", async () => {
        globalThis.fetch = vi.fn(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: "file:///etc/passwd" },
                }),
        );
        await expect(safeFetch("https://site.test/")).rejects.toThrow();
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("gives up after too many redirects", async () => {
        globalThis.fetch = vi.fn(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: "/again" },
                }),
        );
        await expect(safeFetch("https://site.test/")).rejects.toThrow(
            /Too many redirects/,
        );
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
        const second = (globalThis.fetch as any).mock.calls[1][0];
        const secondUrl = typeof second === "string" ? second : second.url;
        expect(secondUrl).toBe("https://site.test/moved");
    });
});
