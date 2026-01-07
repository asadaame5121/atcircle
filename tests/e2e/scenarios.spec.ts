import { expect, Page, test } from "@playwright/test";
import { loginAs } from "../utils";

const randomSuffix = Math.random().toString(36).substring(7);

async function mockAtProto(page: Page) {
    // Mock XRPC calls to avoid hitting production PDS
    await page.route("**/xrpc/com.atproto.repo.createRecord", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                uri: "at://did:plc:mock/collection/rkey",
                cid: "mock-cid",
            }),
        });
    });

    await page.route("**/xrpc/com.atproto.repo.putRecord", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                uri: "at://did:plc:mock/collection/rkey",
                cid: "mock-cid",
            }),
        });
    });

    await page.route("**/xrpc/com.atproto.repo.deleteRecord", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });

    await page.route(
        "**/xrpc/com.atproto.repo.listRecords**",
        async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ records: [] }),
            });
        },
    );

    await page.route("**/xrpc/app.bsky.actor.getProfile**", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                did: "did:plc:mock",
                handle: "mock.bsky.social",
            }),
        });
    });
}

async function ensureSiteRegistered(page: Page, suffix: string) {
    // Wait for potential redirect
    await page.waitForLoadState("domcontentloaded");

    // Check if we are on the registration page based on URL or form presence
    const isRegistrationPage = page.url().includes("/dashboard/site");
    const registerForm = page.locator("#registerForm");

    if (isRegistrationPage || await registerForm.isVisible({ timeout: 3000 })) {
        console.log("Registration form detected. Registering site...");
        await page.fill('input[name="url"]', `https://example-${suffix}.com`);
        await page.fill('input[name="title"]', `Site ${suffix}`);
        await page.fill('textarea[name="description"]', "A test site.");

        // Wait for navigation after submit
        await Promise.all([
            page.waitForURL(/\/dashboard/),
            page.locator('#registerForm button[type="submit"]').click(),
        ]);

        console.log("Site registered.");
    } else {
        console.log(
            "Already on dashboard or not on registration page. URL:",
            page.url(),
        );
    }
}

test.describe("Webring E2E Scenarios", () => {
    // Owner details - Use consistent but unique-per-run IDs if possible, or fully random?
    // If we use random DIDs, we simulate new users every time.
    const ownerDid = `did:plc:owner-${randomSuffix}`;
    const ownerHandle = `owner-${randomSuffix}.bsky.social`;
    const ringName = `Ring ${randomSuffix}`;

    test.describe("Owner Flow", () => {
        test("should create a new ring, verify it, and verify widget access", async ({ page }) => {
            // 0. Setup Mock
            await mockAtProto(page);
            // 1. Login as Owner
            await loginAs(page, ownerDid, ownerHandle);
            await page.goto("/dashboard");
            await ensureSiteRegistered(page, "owner-" + randomSuffix);

            console.log("Current URL:", page.url());
            // console.log("Buttons count:", await page.locator("button").count());
            // console.log("HTML:", await page.content());

            try {
                // 2. Create Ring
                // a button with onclick="create_ring_modal.showModal()"
                await page.locator(
                    'button[onclick="create_ring_modal.showModal()"]',
                ).click({ timeout: 5000 });

                // Wait for modal
                const modal = page.locator("#create_ring_modal");
                await expect(modal).toBeVisible();

                await modal.locator('input[name="title"]').fill(ringName);
                await modal.locator('textarea[name="description"]').fill(
                    "E2E Test Ring",
                );
                // Submit button in the form
                await modal.locator('button[type="submit"]').click();

                // 3. Verify Creation
                // Should redirect to dashboard and show the new ring
                await expect(page).toHaveURL(/dashboard\?msg=created/);
                // Also check text
                await expect(page.getByText(ringName)).toBeVisible();
            } catch (e) {
                await page.screenshot({
                    path: "test-results/create-ring-failure.png",
                    fullPage: true,
                });
                console.log("Creation failed. URL:", page.url());
                // console.log("Body text:", await page.innerText("body"));
                throw e;
            }

            // Verify Configure button exists (implies ownership/admin)
            const configBtn = page.locator(
                'button[onclick*="window.openConfigModalFromBtn"]',
            ).first();
            await expect(configBtn).toBeVisible();

            // 4. Widget Verification
            // The widget link: uses href with widget
            const widgetLink = page.locator('a[href*="/dashboard/ring/widget"]')
                .first();
            await expect(widgetLink).toBeVisible();

            // Visit widget page
            const href = await widgetLink.getAttribute("href");

            if (href) {
                await page.goto(href);
                await expect(page.locator("webring-nav")).toBeVisible();
            }
        });

        test("should delete the created ring", async ({ page }) => {
            await mockAtProto(page);
            await loginAs(page, ownerDid, ownerHandle);
            await page.goto("/dashboard");
            await ensureSiteRegistered(page);

            // Check if ring exists
            const card = page.locator(".card", { hasText: ringName }).first();
            if (!await card.isVisible()) {
                test.skip();
            }

            // Open Config Modal
            const configBtn = card.locator(
                'button[onclick*="window.openConfigModalFromBtn"]',
            );
            await configBtn.click();

            const modal = page.locator("#circle_config_modal");
            await expect(modal).toBeVisible();

            // Handle confirmation dialog for delete
            page.once("dialog", (dialog) => dialog.accept());

            // Click Delete Ring inside modal
            // It uses btn-error class
            await modal.locator("button.btn-error").filter({
                hasText: /delete|削除/i,
            }).or(modal.locator("button.btn-error")).first().click();

            // Should redirect to dashboard with msg=deleted
            await expect(page).toHaveURL(/dashboard\?msg=deleted/);

            await expect(page.getByText(ringName)).not.toBeVisible();
        });
    });

    test.describe("Member Flow", () => {
        const memberDid = `did:plc:member-${randomSuffix}`;
        const memberHandle = `member-${randomSuffix}.bsky.social`;
        let targetRingUri: string;
        let targetRingId: string;

        // Setup: Create a ring as owner first
        test.beforeAll(async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            try {
                await mockAtProto(page);
                await loginAs(page, ownerDid, ownerHandle);

                await page.goto("/dashboard");
                await ensureSiteRegistered(page, "owner-" + randomSuffix);

                // Check if ring already exists
                if (
                    !await page.locator(".card", { hasText: ringName })
                        .isVisible()
                ) {
                    await page.locator(
                        'button[onclick="create_ring_modal.showModal()"]',
                    ).click();
                    const modal = page.locator("#create_ring_modal");
                    await modal.locator('input[name="title"]').fill(ringName);
                    await modal.locator('button[type="submit"]').click();
                    await expect(page).toHaveURL(/dashboard\?msg=created/);
                }

                // Capture Ring URI
                const card = page.locator(".card", { hasText: ringName })
                    .first();
                const configBtn = card.locator(
                    'button[onclick*="window.openConfigModalFromBtn"]',
                );
                targetRingUri = await configBtn.getAttribute("data-uri") || "";
                targetRingId = targetRingUri.split("/").pop() || "";
            } catch (e) {
                console.log("Setup failed", e);
                throw e;
            } finally {
                await context.close();
            }
        });

        test("should join a ring and check dashboard states", async ({ page }) => {
            await mockAtProto(page);
            // 1. Login as Member
            await loginAs(page, memberDid, memberHandle);

            // Ensure member has a site
            await page.goto("/dashboard");
            await ensureSiteRegistered(page, "member-" + randomSuffix);

            // 2. Go to public ring page
            await page.goto("/rings");
            const ringLink = page.getByText(ringName);
            await expect(ringLink).toBeVisible();
            await ringLink.click();

            // Now on Public Ring Page
            // 3. Join Ring
            // The join button
            await page.locator("button.btn-primary").first().click();

            // 4. Dashboard Redirect & UI Verification
            // It should redirect to Dashboard with ring parameters
            await expect(page).toHaveURL(/dashboard.*ring=/);

            // Wait for "Member Test Ring" to appear in the dashboard
            await expect(page.getByText(ringName)).toBeVisible();
        });

        test("should leave the ring", async ({ page }) => {
            await mockAtProto(page);
            await loginAs(page, memberDid, memberHandle);
            await page.goto("/dashboard");
            await ensureSiteRegistered(page, "member-" + randomSuffix);

            const card = page.locator(".card", { hasText: ringName }).first();
            await expect(card).toBeVisible();

            // Click Leave button
            const leaveBtn = card.locator(
                'form[action*="/leave"] button[type="submit"]',
            );

            page.once("dialog", (dialog) => dialog.accept());
            await leaveBtn.click();

            // Verify removal
            await expect(page).toHaveURL(/dashboard\?msg=left/);
            await expect(page.getByText(ringName)).not.toBeVisible();
        });
    });
});
