import { expect, test } from "@playwright/test";

test.describe("Companion Navigation & PWA Tests", () => {
    test("should redirect /rings/companion to /rings if no ring param provided", async ({
        page,
    }) => {
        await page.goto("/rings/companion");
        await expect(page).toHaveURL(/\/rings/);
    });

    test("should serve PWA manifest.webmanifest", async ({ page }) => {
        const response = await page.goto("/manifest.webmanifest");
        expect(response?.status()).toBe(200);
        const json = await response?.json();
        expect(json.name).toBe("AT CIRCLE Companion");
        expect(json.display).toBe("standalone");
    });

    test("should serve Service Worker sw.js", async ({ page }) => {
        const response = await page.goto("/sw.js");
        expect(response?.status()).toBe(200);
        const text = await response?.text();
        expect(text).toContain("atcircle-companion");
    });
});
