import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config: runs against the deployed dev app + dev PDS.
 * Requires E2E_DEV_PDS_URL to be set (otherwise tests self-skip).
 * No webServer: the app must already be deployed (client-metadata.json must
 * live at the app origin for the OAuth client to be registered).
 */
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
        baseURL: process.env.E2E_BASE_URL || "https://dev-at-circle.asadaame5121.net",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
