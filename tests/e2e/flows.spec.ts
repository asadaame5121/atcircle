import { expect, test, type Page } from "@playwright/test";
import { E2E_ACCOUNTS, e2eEnabled, oauthLogin } from "./helpers";

if (e2eEnabled) {
    test.describe.configure({ mode: "serial" });

    const ts = Date.now();
    const RING_TITLE = `E2E Ring ${ts}`;
    const aliceSite = {
        url: `https://alice-${ts}.example.com`,
        title: "Alice E2E Site",
    };
    const bobSite = {
        url: `https://bob-${ts}.example.com`,
        title: "Bob E2E Site",
    };
    let ringUri = "";

    async function registerSite(page: Page, site: { url: string; title: string }) {
        await page.goto("/dashboard");
        const form = page.locator("#registerForm");
        await form.waitFor({ timeout: 15_000 });
        await form.locator('input[name="url"]').fill(site.url);
        await form.locator('input[name="title"]').fill(site.title);
        await form.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/msg=registered/);
    }

    async function ringCard(page: Page, uri: string) {
        return page.locator(".card", { hasText: uri });
    }

    test("alice registers a site", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await registerSite(page, aliceSite);
        await expect(page.getByText(aliceSite.title)).toBeVisible();
    });

    test("alice creates a ring", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await page.goto("/dashboard");
        await page.getByRole("button", { name: /create webring/i }).click();
        const modal = page.locator("#create_ring_modal[open]");
        await modal.waitFor();
        await modal.locator('input[name="title"]').fill(RING_TITLE);
        await modal.locator('textarea[name="description"]').fill(
            "E2E test ring",
        );
        await modal.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/msg=created/);

        const card = page.locator(".card", { hasText: RING_TITLE });
        await card.waitFor();
        const uriText = await card
            .locator("span", { hasText: "URI:" })
            .innerText();
        ringUri = uriText.replace("URI:", "").trim();
        expect(ringUri).toMatch(/^at:\/\//);
    });

    test("alice switches the ring to manual acceptance", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await page.goto("/dashboard");
        const card = page.locator(".card", { hasText: RING_TITLE });
        await card.waitFor();
        await card.getByRole("button", { name: /configure ring/i }).click();
        const modal = page.locator("#circle_config_modal[open]");
        await modal.waitFor();
        await modal.locator("#config-acceptance").selectOption("manual");
        await modal.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/msg=updated/);
    });

    test("bob registers a site and requests to join the ring (pending)", async ({
        page,
    }) => {
        await oauthLogin(page, E2E_ACCOUNTS.bob);
        await registerSite(page, bobSite);

        await page.getByRole("button", { name: /join webring/i }).click();
        const modal = page.locator("#join_ring_modal[open]");
        await modal.waitFor();
        await modal.locator("#join-ring-uri").fill(ringUri);
        await modal.locator('input[name="url"]').fill(bobSite.url);
        await modal.locator('input[name="title"]').fill(bobSite.title);
        await modal.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/msg=joined&policy=manual/);
    });

    test("alice approves bob's join request", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await page.goto("/dashboard");
        const requestCard = page.locator(".card", {
            hasText: `Join Request for ${RING_TITLE}`,
        });
        await requestCard.waitFor({ timeout: 15_000 });
        await requestCard.getByRole("button", { name: /approve/i }).click();
        await expect(page).toHaveURL(/msg=approved/);
    });

    test("bob sees the approved ring membership", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.bob);
        await page.goto("/dashboard");
        const card = page.locator(".card", { hasText: RING_TITLE });
        await card.waitFor();
        await expect(card.getByText(bobSite.url)).toBeVisible();
    });

    test("antenna shows the ring page", async ({ page }) => {
        await page.goto(`/antenna?ring=${encodeURIComponent(ringUri)}`);
        await expect(page).toHaveURL(/\/antenna/);
        await expect(page.getByText(RING_TITLE).first()).toBeVisible();
    });

    test("bob leaves the ring", async ({ page }) => {
        page.on("dialog", (dialog) => dialog.accept());
        await oauthLogin(page, E2E_ACCOUNTS.bob);
        await page.goto("/dashboard");
        const card = page.locator(".card", { hasText: RING_TITLE });
        await card.waitFor();
        await card.getByRole("button", { name: /leave/i }).click();
        await expect(page).toHaveURL(/msg=left/);
        await expect(ringCard(page, ringUri)).toHaveCount(0);
    });

    test("admin can access the admin stats page", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.admin);
        await page.goto("/dashboard/admin/stats");
        await expect(page.getByText("ADMIN STATS")).toBeVisible();
        await expect(page.getByText("alice.pds-dev.asadaame5121.net")).toBeVisible();
    });
}
