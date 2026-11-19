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
    // ログイン済みならログインフォームは出ない
    await expect(page.getByRole("button", { name: "Log in ≫" })).not.toBeVisible();
});
