// Renders the city in a headless browser and saves the still images the site ships:
// the poster frame shown before WebGL starts, the Open Graph card and the README hero.
//
//   node scripts/capture.mjs [base url]   (default http://localhost:3000)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
mkdirSync("public", { recursive: true });
mkdirSync("docs", { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

async function shot(width, height, path, { hideUi = false, type = "png", quality } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: "load", timeout: 90_000 });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  // Skip the opening flight and let the camera settle on the overview.
  await page.getByRole("button", { name: "Skip the flight" }).click({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  if (hideUi) {
    await page.addStyleTag({ content: ".pointer-events-none.absolute.inset-0.z-20, nav[aria-label=Modes] { display: none !important }" });
  }
  await page.waitForTimeout(400);
  // A font that never settles would otherwise stall the screenshot.
  await Promise.race([page.evaluate(() => document.fonts.ready), page.waitForTimeout(5000)]);
  await page.screenshot({ path, type, quality, fullPage: false, timeout: 90_000 });
  await page.close();
  console.log("wrote", path);
}

await shot(1600, 900, "public/poster.jpg", { hideUi: true, type: "jpeg", quality: 82 });
await shot(1200, 630, "public/skyline.jpg", { hideUi: true, type: "jpeg", quality: 85 });
await shot(1600, 1000, "docs/hero.png");
await browser.close();
