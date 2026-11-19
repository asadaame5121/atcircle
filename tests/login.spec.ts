import { expect, test } from "@playwright/test";

const actors = [
    { handle: "asahi.example.com", displayName: "サンプル あさひ" },
    { handle: "asagao.example.net", displayName: "サンプル あさがお" },
    { handle: "mika.example.net", displayName: "前方一致しない" },
];

test.describe("トップのログインフォーム", () => {
    test.beforeEach(async ({ page }) => {
        await page.route(
            "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead**",
            (route) => route.fulfill({ json: { actors } }),
        );
        await page.goto("/");
    });

    test("入力すると前方一致の候補が出て、キーボードで選べる", async ({
        page,
    }) => {
        const input = page.getByRole("combobox");
        await input.fill("asa");
        const list = page.getByRole("listbox");
        await expect(list).toBeVisible();
        await expect(page.getByRole("option")).toHaveCount(2);
        await expect(input).toHaveAttribute("aria-expanded", "true");

        await input.press("ArrowDown");
        await input.press("ArrowDown");
        await expect(input).toHaveAttribute(
            "aria-activedescendant",
            "handle-suggestion-1",
        );
        await input.press("Enter");
        await expect(input).toHaveValue("asagao.example.net");
        await expect(list).toBeHidden();
        await expect(input).toHaveAttribute("aria-expanded", "false");
    });

    test("候補をクリックで選べ、Escape で閉じる", async ({ page }) => {
        const input = page.getByRole("combobox");
        await input.fill("asa");
        await page.getByRole("option", { name: /asahi\.example\.com/ }).click();
        await expect(input).toHaveValue("asahi.example.com");

        await input.fill("asag");
        await expect(page.getByRole("listbox")).toBeVisible();
        await input.press("Escape");
        await expect(page.getByRole("listbox")).toBeHidden();
    });

    test("1文字では問い合わせない", async ({ page }) => {
        let calls = 0;
        await page.route(
            "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead**",
            (route) => {
                calls++;
                return route.fulfill({ json: { actors } });
            },
        );
        await page.getByRole("combobox").fill("a");
        await page.waitForTimeout(500);
        expect(calls).toBe(0);
        await expect(page.getByRole("listbox")).toBeHidden();
    });
});
