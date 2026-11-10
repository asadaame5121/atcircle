import { expect, test } from "@playwright/test";
import { loginAs, TEST_USER } from "./utils";

test.describe("リングを探す", () => {
    for (const width of [320, 390, 1280]) {
        test(`${width}px で横スクロールが出ない`, async ({ page }) => {
            await page.setViewportSize({ width, height: 800 });
            await page.goto("/rings");
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
            const scrollWidth = await page.evaluate(
                () => document.documentElement.scrollWidth,
            );
            expect(scrollWidth).toBeLessThanOrEqual(width);
        });
    }

    test("検索語を入れて Enter で絞り込める", async ({ page }) => {
        await page.goto("/rings");
        const search = page.getByRole("searchbox");
        await search.fill("zzzz-no-such-ring");
        await search.press("Enter");
        await expect(page).toHaveURL(/q=zzzz-no-such-ring/);
        await expect(search).toHaveValue("zzzz-no-such-ring");
    });

    test("ログイン中は進み具合を出す", async ({ page }) => {
        await loginAs(page, TEST_USER.did, TEST_USER.handle);
        await page.goto("/rings");
        await expect(page.locator('li[aria-current="step"]')).toBeVisible();
    });

    test("動きを減らす設定では流れる文字を止める", async ({ browser }) => {
        const ctx = await browser.newContext({ reducedMotion: "reduce" });
        const page = await ctx.newPage();
        await page.goto("http://localhost:8080/rings");
        const span = page.locator(".rt-marquee > span");
        test.skip((await span.count()) === 0, "最近の動きがないため流れる文字が出ていない");
        const animation = await span.evaluate(
            (el) => getComputedStyle(el).animationName,
        );
        expect(animation).toBe("none");
        await ctx.close();
    });
});
