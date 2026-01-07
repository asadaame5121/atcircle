import { expect, test } from "@playwright/test";
import { loginAs, TEST_USER } from "./utils";

test("should login successfully with bypass", async ({ page }) => {
    await loginAs(page, TEST_USER.did, TEST_USER.handle);
    await page.goto("/dashboard");
    // If we stay on dashboard or see "Logout" or username, it worked.
    // If we are redirected to /login, it failed.
    await expect(page).toHaveURL("/dashboard");
    const bodyText = await page.innerText("body");
    // Usually dashboard shows handle or "Logout"
    // Expect body NOT to contain "Login with Bluesky" if we are logged in?
    // Actually the login page has "Login with Bluesky".
    // Dashbaord should NOT have it (or definitely has "Create Ring")
    await expect(page.getByText("Login with Bluesky")).not.toBeVisible();
});
