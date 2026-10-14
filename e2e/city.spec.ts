import { expect, test } from "@playwright/test";

/**
 * Load, search, open a card, follow "Open in Contributable". Runs against a production
 * build fed by the fixture server, so the numbers below come from the recorded slice.
 */
test("loads, searches, opens a card and links to Contributable", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "OSS City" })).toBeVisible();
  await expect(page.getByText("projects in the city")).toBeVisible();
  await expect(page.getByText(/Data from Contributable, updated/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Powered by Contributable" })).toHaveAttribute(
    "href",
    "https://contributable.vercel.app",
  );

  // The feed arrives and the search becomes usable.
  const search = page.getByRole("searchbox", { name: "Light up your stack" });
  await expect(search).toBeEnabled();
  await search.fill("python");
  await expect(page.getByText(/\d+ matches/)).toBeVisible();

  // The list view has the same data; open a card from there is not possible, so use the
  // ghost towns list, which opens a card for a known building.
  await page.getByRole("button", { name: "Ghost towns" }).click();
  const first = page.getByRole("region", { name: "Ghost towns" }).getByRole("button").nth(1);
  await first.click();

  const card = page.getByRole("dialog");
  await expect(card).toBeVisible();
  await expect(card.getByText("First reply")).toBeVisible();
  await expect(card.getByText("Busiest reply hours")).toBeVisible();

  const open = card.getByRole("link", { name: "Open in Contributable" });
  const href = await open.getAttribute("href");
  expect(href).toMatch(/^https:\/\/contributable\.vercel\.app\/repo\/[^/]+\/[^/]+$/);
  const title = await card.getByRole("heading", { level: 2 }).textContent();
  expect(href?.endsWith(`/${title}`)).toBe(true);

  // Escape closes the card.
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
});

test("the list view sorts and the repository redirect points at Contributable", async ({ page, request }) => {
  await page.goto("/list");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every building, as a list");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Stars" }).click();
  await expect(page.getByRole("columnheader", { name: /Stars/ })).toHaveAttribute("aria-sort", "descending");

  const response = await request.get("/r/metabrainz/picard", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe("https://contributable.vercel.app/repo/metabrainz/picard");
});
