import { expect, test } from "@playwright/test";

// ヘッダーとナビの崩れを防ぐ回帰テスト。
// ロゴとナビの各リンクが画面幅に収まり、横スクロールが出ないことを確かめる。
for (const width of [320, 390, 1280]) {
    test(`header fits within ${width}px viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/help");
        const header = page.locator("header.rt-header");
        await header.waitFor();

        const brand = header.locator('a[href="/"]');
        await expect(brand).toBeVisible();
        const brandBox = await brand.boundingBox();
        expect(brandBox).not.toBeNull();
        expect(brandBox.x).toBeGreaterThanOrEqual(0);
        expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(width + 0.5);

        const links = page.locator("nav.rt-nav a");
        expect(await links.count()).toBe(4);
        for (const link of await links.all()) {
            await expect(link).toBeVisible();
            const box = await link.boundingBox();
            expect(box).not.toBeNull();
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
            expect(box.height).toBeGreaterThanOrEqual(44);
        }

        const scrollWidth = await page.evaluate(
            () => document.documentElement.scrollWidth,
        );
        expect(scrollWidth).toBeLessThanOrEqual(width);
    });
}
