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

async function expectMinimumTouchTargets(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const undersized = await page.locator("a[href], button:not([disabled])").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const bounds = node.getBoundingClientRect();
      const visible = style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
      if (!visible || (bounds.width >= 44 && bounds.height >= 44)) return [];
      return [{
        label: (node.textContent ?? node.getAttribute("aria-label") ?? node.tagName).trim().slice(0, 60),
        width: Math.round(bounds.width * 10) / 10,
        height: Math.round(bounds.height * 10) / 10,
        className: node.className
      }];
    })
  );
  expect(undersized, `undersized touch targets: ${JSON.stringify(undersized)}`).toEqual([]);
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
    await expect(page.locator(".theme-toggle")).toHaveAttribute("aria-label", "라이트 모드로 전환");
    expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBe("dark");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("home keeps the four-section hiring narrative and bounded mobile length", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("main > section")).toHaveCount(4);
    expect(await page.locator("main a").count()).toBeLessThanOrEqual(12);
    for (const slug of ["hajacheck", "ml-economics-answers", "machine-learning-oil"]) {
      await expect(page.locator(`main a[href="/projects/${slug}/"]`)).toHaveCount(1);
    }
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThanOrEqual(6_500);
  });

  test("project index exposes exactly one detail link per project", async ({ page }) => {
    await page.goto("/projects/", { waitUntil: "networkidle" });
    const cards = page.locator("main .project-card");
    await expect(cards).toHaveCount(9);
    for (let index = 0; index < 9; index += 1) {
      await expect(cards.nth(index).locator("a[href]")).toHaveCount(1);
    }
    await expect(page.locator('main a[href^="/projects/"]')).toHaveCount(9);
  });

  test("responsive project art direction and image decoding work", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/projects/", { waitUntil: "networkidle" });
    await page.locator(".project-cover img").evaluateAll(async (images) => {
      for (const image of images) {
        const node = image as HTMLImageElement;
        node.loading = "eager";
        if (!node.complete) await new Promise((resolve) => node.addEventListener("load", resolve, { once: true }));
        await node.decode();
      }
    });
    const mobileSources = await page.locator(".project-cover img").evaluateAll((images) =>
      images.map((image) => ({
        currentSrc: (image as HTMLImageElement).currentSrc,
        naturalWidth: (image as HTMLImageElement).naturalWidth
      }))
    );
    expect(mobileSources).toHaveLength(9);
    expect(mobileSources.every(({ currentSrc }) => currentSrc.includes("cover-mobile"))).toBe(true);
    expect(mobileSources.every(({ naturalWidth }) => naturalWidth > 0)).toBe(true);

    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".project-cover img").evaluateAll(async (images) => {
      for (const image of images) {
        const node = image as HTMLImageElement;
        node.loading = "eager";
        if (!node.complete) await new Promise((resolve) => node.addEventListener("load", resolve, { once: true }));
        await node.decode();
      }
    });
    const desktopSources = await page.locator(".project-cover img").evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).currentSrc)
    );
    expect(desktopSources.every((source) => !source.includes("cover-mobile"))).toBe(true);
  });

  test("home hero uses a source-backed evidence index instead of a project image", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator(".hero--project img")).toHaveCount(0);
    await expect(page.locator(".hero-evidence")).toHaveCount(1);
    await expect(page.locator(".hero-evidence__head h2")).toHaveText("HajaCheck");
    await expect(page.locator(".hero-evidence__scope dt")).toHaveText(["My scope", "Flyway", "Merged PR"]);
    await expect(page.locator(".hero-evidence__flow li")).toHaveText(["사진", "AI 분석", "사람 검수", "보고서"]);
  });

  test("detail evidence galleries expose responsive images and scope labels", async ({ page }) => {
    await page.goto("/projects/hajacheck/", { waitUntil: "networkidle" });
    const images = page.locator(".project-gallery .project-visual img");
    await expect(images).toHaveCount(2);
    await images.last().scrollIntoViewIfNeeded();
    await images.evaluateAll(async (nodes) => {
      for (const image of nodes) {
        const node = image as HTMLImageElement;
        if (!node.complete) await new Promise((resolve) => node.addEventListener("load", resolve, { once: true }));
        await node.decode();
      }
    });
    expect(await images.evaluateAll((nodes) => nodes.every((node) => (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await expect(page.locator(".project-visual figcaption span")).toHaveText(["팀 산출물", "팀 산출물"]);
    await expect(page.locator('.project-gallery source[srcset*="-480w.webp"]')).toHaveCount(2);
  });

  test("all mobile controls meet the 44 by 44 target", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of htmlRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectMinimumTouchTargets(page);
    }
  });

  test("all routes retain WCAG 2.2 AA automated coverage", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    for (const route of htmlRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const accessibility = await new AxeBuilder({ page: page as never })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(accessibility.violations, route).toEqual([]);
    }
  });

  test("project pages expose complete social image metadata", async ({ page }) => {
    await page.goto("/projects/hajacheck/", { waitUntil: "networkidle" });
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/media\/projects\/hajacheck\/cover-og\.webp$/);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /\S+/);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", /\S+/);
  });

  test("resume print keeps content and removes navigation actions", async ({ page }) => {
    await page.goto("/resume/", { waitUntil: "networkidle" });
    await page.locator("#experience").scrollIntoViewIfNeeded();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator(".site-footer")).toBeHidden();
    await expect(page.locator(".resume-actions")).toBeHidden();
    await expect(page.locator("#experience")).toBeVisible();
  });
});
