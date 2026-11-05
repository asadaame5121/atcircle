import { safeFetchWrap } from "@atproto-labs/fetch-node";

/**
 * SSRF-hardened fetch for URLs supplied by users (site pages, RSS feeds).
 *
 * - Only http/https on default ports
 * - Hostnames resolving to private, loopback, link-local or other
 *   non-unicast addresses are rejected at connect time (DNS-rebinding safe)
 * - Redirects are followed manually so every hop is re-validated
 *   (including redirects to literal IP addresses)
 * - Timeout and response size limits
 */

const MAX_REDIRECTS = 5;

const guardedFetch = safeFetchWrap({
    // Resolve globalThis.fetch lazily so it can be stubbed in tests.
    fetch: (input, init) => globalThis.fetch(input, init),
    ssrfProtection: true,
    allowHttp: true, // many personal sites are still served over plain http
    allowCustomPort: false,
    allowData: false,
    allowPrivateIps: false,
    timeout: 10_000,
    responseMaxSize: 2 * 1024 * 1024,
    // The default list blocks example.* domains, which is irrelevant here.
    forbiddenDomainNames: [],
});

export interface SafeFetchOptions {
    headers?: Record<string, string>;
}

export class UnsafeUrlError extends Error {}

export async function safeFetch(
    url: string,
    options: SafeFetchOptions = {},
): Promise<Response> {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const res = await guardedFetch(current, {
            method: "GET",
            headers: options.headers,
            redirect: "manual",
        });

        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get("location");
            await res.body?.cancel().catch(() => {});
            if (!location) return res;
            current = new URL(location, current).toString();
            continue;
        }
        return res;
    }
    throw new UnsafeUrlError(`Too many redirects: ${url}`);
}
