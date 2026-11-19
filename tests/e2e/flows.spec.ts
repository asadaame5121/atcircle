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
        if (!(await form.isVisible({ timeout: 5_000 }).catch(() => false))) {
            return; // site already registered (idempotent across runs)
        }
        await form.locator('input[name="url"]').fill(site.url);
        await form.locator('input[name="title"]').fill(site.title);
        await form.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/msg=registered/);
        await expect(page.getByText(site.title)).toBeVisible();
    }

    function ringCard(page: Page) {
        return page.locator("article.rt-dash-ring", { hasText: RING_TITLE });
    }

    test("alice registers a site (idempotent)", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await registerSite(page, aliceSite);
        await expect(page.getByText(aliceSite.title)).toBeVisible();
    });

    test("alice creates a ring", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await page.goto("/rings/new");
        await page.locator('input[name="title"]').fill(RING_TITLE);
        await page.locator('textarea[name="description"]').fill(
            "E2E test ring",
        );
        await page.getByRole("button", { name: /create/i }).click();
        // 作成するとそのままウィジェットの画面へ進む
        await expect(page).toHaveURL(/\/dashboard\/ring\/widget\?ring_uri=/);
        ringUri =
            new URL(page.url()).searchParams.get("ring_uri") || "";
        expect(ringUri).toMatch(/^at:\/\//);
    });

    test("alice switches the ring to manual acceptance", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await page.goto("/dashboard");
        const card = ringCard(page);
        await card.waitFor();
        await card.locator("details.rt-menu > summary").click();
        await card.getByRole("button", { name: /ring settings/i }).click();
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

        // 「リングを探す」の参加欄から申請する
        await page.goto(`/rings?select=${encodeURIComponent(ringUri)}#join`);
        const join = page.locator("#join");
        await join.locator('input[name="url"]').fill(bobSite.url);
        await join.locator('input[name="title"]').fill(bobSite.title);
        await join.getByRole("button", { name: /request to join/i }).click();
        // 承認制なので承認待ちの画面になり、コードは出ない
        await expect(page).toHaveURL(/\/dashboard\/ring\/widget\?.*requested=1/);
        await expect(page.locator("#w-code")).toHaveCount(0);
    });

    test("alice approves bob's join request", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.alice);
        await page.goto("/dashboard");
        const requestCard = page.locator("#requests .rt-mod-row", {
            hasText: bobSite.title,
        });
        await requestCard.waitFor({ timeout: 15_000 });
        await requestCard.getByRole("button", { name: /approve/i }).click();
        await expect(page).toHaveURL(/msg=approved/);
        // The request disappears from the moderation section after approval
        await expect(requestCard).toHaveCount(0);
    });

    test("bob sees the ring listed on the dashboard", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.bob);
        await page.goto("/dashboard");
        const card = ringCard(page);
        await card.waitFor();
        await expect(card).toBeVisible();
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
        const card = ringCard(page);
        await card.waitFor();
        await card.locator("details.rt-menu > summary").click();
        await card.getByRole("button", { name: /leave ring/i }).click();
        await expect(page).toHaveURL(/msg=left/);
        // 離脱するとそのリングは一覧から消える
        await expect(ringCard(page)).toHaveCount(0);
    });

    test("admin can access the admin stats page", async ({ page }) => {
        await oauthLogin(page, E2E_ACCOUNTS.admin);
        await page.goto("/dashboard/admin/stats");
        await expect(page.getByText("ADMIN STATS")).toBeVisible();
        await expect(page.getByText("alice.pds-dev.asadaame5121.net")).toBeVisible();
    });
}
