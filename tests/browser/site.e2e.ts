import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const projectSlugs = [
  "hajacheck",
  "ml-economics-answers",
  "machine-learning-oil",
  "plushome",
  "deep-learning-sleep",
  "advanced-project",
  "pet-platform-project",
  "project-final",
  "bmi-calculator"
];

const htmlRoutes = [
  "/",
  "/projects/",
  ...projectSlugs.map((slug) => `/projects/${slug}/`),
  "/resume/",
  "/404.html"
];

const viewportWidths = [390, 768, 1440];
const displayModes = [
  { name: "light", theme: "light", colorScheme: "light" as const, reducedMotion: "no-preference" as const },
  { name: "dark", theme: "dark", colorScheme: "dark" as const, reducedMotion: "no-preference" as const },
  { name: "reduced motion", theme: "light", colorScheme: "light" as const, reducedMotion: "reduce" as const }
];

async function trackBrowserErrors(page: Page) {
  const errors = [] as string[];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className,
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
          width: Math.round(bounds.width)
        };
      })
      .filter((item) => item.left < -1 || item.right > document.documentElement.clientWidth + 1)
      .slice(0, 8)
  }));
  expect(
    dimensions.scrollWidth,
    `horizontal overflow: ${JSON.stringify(dimensions.offenders)}`
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectVisibleKeyboardFocus(page: Page) {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  const checked = new Set<string>();
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return undefined;
      const style = getComputedStyle(element);
      return {
        key: `${element.tagName}:${element.getAttribute("href") ?? element.className}`,
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        boxShadow: style.boxShadow
      };
    });
    if (!focus || checked.has(focus.key)) continue;
    checked.add(focus.key);
    const hasOutline = focus.outlineStyle !== "none" && focus.outlineWidth > 0;
    const hasShadow = focus.boxShadow !== "none";
    expect(hasOutline || hasShadow, `${focus.key} has no visible keyboard focus`).toBe(true);
  }
  expect(checked.size).toBeGreaterThan(1);
}

test.describe("static route contract", () => {
  for (const route of htmlRoutes) {
    test(`${route} is directly accessible`, async ({ page }) => {
      const browserErrors = await trackBrowserErrors(page);
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://polalise.github.io${route}`);
      expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(40);
      expect(browserErrors).toEqual([]);
    });
  }

  test("resume PDF is public and selectable content is served as a PDF", async ({ request }) => {
    const response = await request.get("/resume/resume.pdf");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).byteLength).toBeGreaterThan(1_000);
  });

  test("unknown routes return a not found response", async ({ page }) => {
    const response = await page.goto("/this-route-must-not-exist", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
    expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
  });
});

test.describe("responsive themes and accessibility", () => {
  for (const width of viewportWidths) {
    for (const mode of displayModes) {
      test(`${width}px ${mode.name}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.emulateMedia({ colorScheme: mode.colorScheme, reducedMotion: mode.reducedMotion });
        await page.addInitScript((theme) => localStorage.setItem("portfolio-theme", theme), mode.theme);
        const browserErrors = await trackBrowserErrors(page);
        const response = await page.goto("/", { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("data-theme", mode.theme);
        await expect(page.locator("main h1")).toBeVisible();
        await expectNoHorizontalOverflow(page);

        const accessibility = await new AxeBuilder({ page: page as never })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(accessibility.violations).toEqual([]);

        if (mode.reducedMotion === "reduce") {
          const revealStates = await page.locator("[data-reveal]").evaluateAll((elements) =>
            elements.map((element) => {
              const style = getComputedStyle(element);
              return {
                visible: (element as HTMLElement).dataset.visible,
                opacity: style.opacity,
                transform: style.transform
              };
            })
          );
          expect(revealStates.every((state) => state.visible === "true" && state.opacity === "1" && state.transform === "none")).toBe(true);
        }

        expect(browserErrors).toEqual([]);
      });
    }
  }

  for (const width of viewportWidths) {
    test(`all content routes avoid overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const route of htmlRoutes.filter((route) => route !== "/404.html")) {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.status(), route).toBe(200);
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test("keyboard navigation has a visible focus indicator", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expectVisibleKeyboardFocus(page);
  });

  test("theme control persists the selected theme", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.setItem("portfolio-theme", "light"));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBe("dark");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
