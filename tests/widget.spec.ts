import { expect, test } from "@playwright/test";
import { loginAs } from "./utils";

// 開発用 DB に did:plc:a のサイト・参加・申請があるときだけ動く画面確認
const ME = { did: "did:plc:a", handle: "asadaame5121.net" };
const RING = "at://did:plc:a/net.asadaame5121.at-circle.ring/1";
const PENDING_RING = "at://did:plc:a/net.asadaame5121.at-circle.ring/2";

test.describe("ウィジェットを貼る", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, ME.did, ME.handle);
    });

    test("HTML版のコードは従来と同じ形で、切り替えると Web Components 版になる", async ({
        page,
    }) => {
        await page.goto(`/dashboard/ring/widget?ring_uri=${encodeURIComponent(RING)}`);
        test.skip(
            (await page.locator("#w-code").count()) === 0,
            "開発用 DB にテストデータがない",
        );
        const site = await page.locator("#widget-builder").getAttribute("data-site-url");
        const base = await page.locator("#widget-builder").getAttribute("data-base-url");
        const title = await page.locator("#widget-builder").getAttribute("data-ring-title");
        const enc = encodeURIComponent;
        const expectedHtml =
            '<div id="atcircle" style="border: 1px solid #ccc; padding: 10px; border-radius: 8px; display: inline-block;">\n' +
            `  <strong>${title}</strong><br/>\n` +
            `  <a href="${base}/p?from=${enc(site)}&ring=${enc(RING)}">Prev</a> | \n` +
            `  <a href="${base}/r?ring=${enc(RING)}">Random</a> | \n` +
            `  <a href="${base}/n?from=${enc(site)}&ring=${enc(RING)}">Next</a> | \n` +
            `  <a href="${base}/rings/view?ring=${enc(RING)}">List</a>\n` +
            "</div>";
        await expect(page.locator("#w-code")).toHaveText(expectedHtml, {
            useInnerText: false,
        });

        await page.getByRole("button", { name: "Web Components" }).click();
        await expect(
            page.getByRole("button", { name: "Web Components" }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("#w-code")).toHaveText(
            `<script src="${base}/nav/widget.js"></script>\n` +
                `<webring-nav site="${site}" ring="${RING}" layout="simple"></webring-nav>`,
            { useInnerText: false },
        );

        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.locator("#btn-copy").click();
        await expect(page.locator("#copy-status")).not.toBeEmpty();
    });

    test("承認待ちならコードを出さない", async ({ page }) => {
        await page.goto(
            `/dashboard/ring/widget?ring_uri=${encodeURIComponent(PENDING_RING)}`,
        );
        test.skip(
            !(await page.locator("li[aria-current=step]").textContent())?.includes(
                "STEP2",
            ),
            "開発用 DB にテストデータがない",
        );
        await expect(page.locator("#w-code")).toHaveCount(0);
    });
});
