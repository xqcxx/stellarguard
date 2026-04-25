import { expect, test } from "@playwright/test";

test.describe("treasury happy-path smoke", () => {
  test("loads treasury dashboard with mocked data", async ({ page }) => {
    await page.goto("/treasury");

    await expect(
      page.getByRole("heading", { name: "Treasury" }),
    ).toBeVisible();
    await expect(page.getByText("Pending Transactions")).toBeVisible();
    await expect(page.getByText("Execution History")).toBeVisible();

    await expect(
      page.getByText("Validator infrastructure costs"),
    ).toBeVisible();
    await expect(page.getByText("Quarterly community grant")).toBeVisible();
    await expect(page.getByText(/matching transaction/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  });
});
