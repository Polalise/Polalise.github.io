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

  // Design 02 로 정보 구조를 바꾸면서 이전 계약(섹션 4개, 히어로 이미지 0개, 높이 6,500px)을
  // 의도적으로 교체했다. 링크 상한 12개는 새 구조에서도 그대로 지켜져 유지한다.
  // 높이 상한은 2026-08-14 실측 7,441px 기준으로 약 5% 여유를 둔 회귀 기준이다.
  test("home keeps the Design 02 narrative, link budget, and bounded mobile length", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("main > section")).toHaveCount(6);
    for (const id of ["work", "featured", "about", "contact"]) {
      await expect(page.locator(`main section#${id}`)).toHaveCount(1);
    }
    expect(await page.locator("main a").count()).toBeLessThanOrEqual(12);
    for (const slug of ["hajacheck", "ml-economics-answers", "machine-learning-oil"]) {
      await expect(page.locator(`main a[href="/projects/${slug}/"]`)).toHaveCount(2);
    }
    await expect(page.locator('main a[href="/projects/"]')).toHaveCount(1);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThanOrEqual(7_800);
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

  // Design 02 히어로는 실제 제품 화면 하나를 크게 보여준다. 생성 다이어그램이나 목업이 아니라
  // 원본 저장소의 실행 화면이어야 하므로 경로와 대체텍스트까지 검사한다.
  test("home hero shows one real HajaCheck product screen with a described alt", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const heroImage = page.locator(".d2-hero__preview img");
    await expect(heroImage).toHaveCount(1);
    await expect(heroImage).toHaveAttribute("src", /\/media\/projects\/hajacheck\/visuals\/app-dashboard\.webp$/);
    await expect(heroImage).toHaveAttribute("loading", "eager");
    expect((await heroImage.getAttribute("alt"))?.trim().length ?? 0).toBeGreaterThan(20);
    await heroImage.evaluate(async (node) => {
      const image = node as HTMLImageElement;
      if (!image.complete) await new Promise((resolve) => image.addEventListener("load", resolve, { once: true }));
      await image.decode();
    });
    expect(await heroImage.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

  test("project explorer is operable by pointer and keyboard with one panel at a time", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const tabs = page.locator('.d2-explorer__index [role="tab"]');
    const panels = page.locator('.d2-explorer__stage [role="tabpanel"]');
    await expect(tabs).toHaveCount(4);
    await expect(panels).toHaveCount(4);

    const visiblePanels = async () =>
      panels.evaluateAll((nodes) => nodes.filter((node) => !(node as HTMLElement).hidden).length);
    expect(await visiblePanels()).toBe(1);
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

    // 클릭 선택
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
    expect(await visiblePanels()).toBe(1);
    await expect(panels.nth(2)).toBeVisible();

    // 키보드 이동은 roving tabindex 로 처리한다
    await tabs.nth(2).focus();
    await page.keyboard.press("ArrowDown");
    await expect(tabs.nth(3)).toBeFocused();
    await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await expect(tabs.nth(0)).toBeFocused();
    expect(await visiblePanels()).toBe(1);

    // 선택되지 않은 탭은 Tab 순서에서 빠진다
    expect(await tabs.evaluateAll((nodes) => nodes.filter((node) => (node as HTMLElement).tabIndex === 0).length)).toBe(1);
  });

  test("detail evidence galleries expose responsive images and scope labels", async ({ page }) => {
    await page.goto("/projects/hajacheck/", { waitUntil: "networkidle" });
    const images = page.locator(".project-gallery .project-visual img");
    await expect(images).toHaveCount(3);
    await images.last().scrollIntoViewIfNeeded();
    await images.evaluateAll(async (nodes) => {
      for (const image of nodes) {
        const node = image as HTMLImageElement;
        if (!node.complete) await new Promise((resolve) => node.addEventListener("load", resolve, { once: true }));
        await node.decode();
      }
    });
    expect(await images.evaluateAll((nodes) => nodes.every((node) => (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    // 대시보드와 분석 뷰어는 팀 전체 산출물, 하자 상세는 개인 담당 범위다.
    await expect(page.locator(".project-visual figcaption span")).toHaveText(["팀 산출물", "팀 산출물", "개인 구현·분석"]);
    await expect(page.locator('.project-gallery source[srcset*="-480w.webp"]')).toHaveCount(3);
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
