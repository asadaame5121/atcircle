import { chromium } from "playwright";
import { E2E_ACCOUNTS, oauthLogin } from "./tests/e2e/helpers";

const BASE = "https://dev-at-circle.asadaame5121.net";
const dir = "/tmp/opencode/screens";
import { mkdirSync } from "node:fs";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();

for (const width of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();

    await page.goto("/", { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/home-${width}.png`, fullPage: true });

    await page.goto("/rings");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/rings-${width}.png`, fullPage: true });

    const ringLink = page.locator('a[href^="/rings/view?"]').first();
    if (await ringLink.count()) {
        await ringLink.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${dir}/ringdetail-${width}.png`, fullPage: true });
    }
    await ctx.close();
}

// Logged-in dashboard (alice)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await oauthLogin(page, E2E_ACCOUNTS.alice);
await page.goto("/dashboard");
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/dashboard-1280.png`, fullPage: true });

const ctxM = await browser.newContext({ viewport: { width: 390, height: 800 } });
const pageM = await ctxM.newPage();
await oauthLogin(pageM, E2E_ACCOUNTS.alice);
await pageM.goto("/dashboard");
await pageM.waitForTimeout(2500);
await pageM.screenshot({ path: `${dir}/dashboard-390.png`, fullPage: true });

await browser.close();
console.log("screenshots saved to", dir);
