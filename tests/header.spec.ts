import { expect, test } from "@playwright/test";

// Guards against mobile header regressions: the brand logo must stay
// inside the viewport (truncated) and the hamburger/menu must not be
// pushed off-screen by overflowing content.
for (const width of [320, 390, 1280]) {
    test(`header fits within ${width}px viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/");
        const header = page.locator("header");
        await header.waitFor();

        const brand = header.locator('a[href="/"]');
        await expect(brand).toBeVisible();
        const brandBox = await brand.boundingBox();
        expect(brandBox).not.toBeNull();
        expect(brandBox.x).toBeGreaterThanOrEqual(0);
        expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(width + 0.5);

        const navItems =
            width >= 640
                ? 'div.navbar-end.hidden a:last-child'
                : "details.dropdown summary";
        const menu = header.locator(navItems).last();
        await expect(menu).toBeVisible();
        const menuBox = await menu.boundingBox();
        expect(menuBox).not.toBeNull();
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width + 0.5);
    });
}
