import { expect, test } from "@playwright/test";
import { E2E_ACCOUNTS, E2E_APP_ORIGIN, e2eEnabled, oauthLogin } from "./helpers";

if (e2eEnabled) {
    test.describe("OAuth flow against dev PDS", () => {
        test("alice can log in via OAuth and reach the dashboard", async ({ page }) => {
            await oauthLogin(page, E2E_ACCOUNTS.alice);
            await expect(page).toHaveURL(/\/dashboard/);
            await expect(page.getByText("Logout")).toBeVisible();
        });

        test("bob can log in via OAuth and reach the dashboard", async ({ page }) => {
            await oauthLogin(page, E2E_ACCOUNTS.bob);
            await expect(page).toHaveURL(/\/dashboard/);
            await expect(page.getByText("Logout")).toBeVisible();
        });

        test("already-authorized account logs in without the grant page", async ({ page }) => {
            await oauthLogin(page, E2E_ACCOUNTS.alice);
            await expect(page).toHaveURL(/\/dashboard/);
            await expect(page.getByText("Logout")).toBeVisible();
        });

        test("logout returns to the home page", async ({ page }) => {
            await oauthLogin(page, E2E_ACCOUNTS.alice);
            await page.goto("/logout");
            await expect(page).toHaveURL(new RegExp(`^${E2E_APP_ORIGIN}/?$`));
            // Hero CTA is the primary login link on the refreshed home page
            await expect(
                page.getByRole("link", { name: "Login with Bluesky" }).first(),
            ).toBeVisible();
        });
    });
}
