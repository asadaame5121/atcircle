import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.E2E_BASE_URL || "https://dev-at-circle.asadaame5121.net";
const PDS = process.env.E2E_DEV_PDS_URL || "https://pds-dev.asadaame5121.net";
const dir = "screenshots";
mkdirSync(dir, { recursive: true });

const ALICE = {
    handle:
        process.env.TEST_ALICE_HANDLE || "alice.pds-dev.asadaame5121.net",
    password: process.env.TEST_ALICE_PASSWORD || "alice-test-pw-2026",
};

async function oauthLogin(page, account) {
    await page.goto(`${BASE}/`, { timeout: 60000 }).catch(() => {});
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="handle"]', account.handle);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`^${PDS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), {
        timeout: 30000,
    });
    const pwd = page.locator('input[type="password"]');
    await pwd.waitFor({ timeout: 15000 });
    await pwd.fill(account.password);
    await page.locator('button[type="submit"], input[type="submit"]').first().click();
    const grant = page.getByRole("button", { name: /^authorize|^承認/i });
    try {
        await grant.waitFor({ state: "visible", timeout: 15000 });
        await grant.click();
    } catch {}
    await page.waitForURL(new RegExp(`^${BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), {
        timeout: 30000,
    });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/home.png`, fullPage: false });

await page.goto(`${BASE}/rings`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/rings.png`, fullPage: false });

const ringLink = page.locator('a[href^="/rings/view?"]').first();
if (await ringLink.count()) {
    await ringLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/ring-detail.png`, fullPage: false });
}

await oauthLogin(page, ALICE);
await page.goto(`${BASE}/dashboard`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/dashboard.png`, fullPage: false });

await browser.close();
console.log("screenshots saved to", dir);
