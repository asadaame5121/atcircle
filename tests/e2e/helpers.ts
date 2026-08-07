import { type Page } from "@playwright/test";

export const E2E_DEV_PDS_URL = process.env.E2E_DEV_PDS_URL;

export const e2eEnabled = Boolean(E2E_DEV_PDS_URL);

export const E2E_APP_ORIGIN = new URL(
    process.env.E2E_BASE_URL || "https://dev-at-circle.asadaame5121.net",
).origin;

export const E2E_PDS_ORIGIN = E2E_DEV_PDS_URL
    ? new URL(E2E_DEV_PDS_URL).origin
    : "https://pds-dev.asadaame5121.net";

export const E2E_ACCOUNTS = {
    alice: {
        handle: "alice.pds-dev.asadaame5121.net",
        password: process.env.TEST_ALICE_PASSWORD || "alice-test-pw-2026",
    },
    bob: {
        handle: "bob.pds-dev.asadaame5121.net",
        password: process.env.TEST_BOB_PASSWORD || "bob-test-pw-2026",
    },
    admin: {
        handle: "atcircle-admin.pds-dev.asadaame5121.net",
        password: process.env.TEST_ADMIN_PASSWORD || "admin-test-pw-2026",
    },
};

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function oauthLogin(page: Page, account: { handle: string; password: string }) {
    // Wake up the app first: Fly auto-stops idle machines and the first
    // request after a cold start can time out.
    await page.goto("/", { timeout: 60_000 }).catch(() => {});

    for (let attempt = 1; ; attempt++) {
        try {
            await attemptLogin(page, account);
            return;
        } catch (e) {
            if (attempt >= 3) throw e;
            // Retry after a cold start / transient failure
            await page.waitForTimeout(3_000);
            await page.goto("/", { timeout: 60_000 }).catch(() => {});
        }
    }
}

async function attemptLogin(page: Page, account: { handle: string; password: string }) {
    await page.goto("/login");
    await page.fill('input[name="handle"]', account.handle);
    await page.click('button[type="submit"]');

    await page.waitForURL(new RegExp(`^${escapeRegExp(E2E_PDS_ORIGIN)}`), {
        timeout: 30_000,
    });

    const pwd = page.locator('input[type="password"]');
    await pwd.waitFor({ timeout: 15_000 });
    await pwd.fill(account.password);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();

    // If the client was already authorized, PDS redirects straight back to the app.
    const grant = page.getByRole("button", { name: /^authorize/i });
    try {
        await grant.waitFor({ state: "visible", timeout: 15_000 });
        await grant.click();
    } catch {
        // already authorized
    }

    await page.waitForURL(new RegExp(`^${escapeRegExp(E2E_APP_ORIGIN)}`), {
        timeout: 30_000,
    });
}
