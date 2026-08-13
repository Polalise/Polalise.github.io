import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  approvedEmail,
  auditText,
  extractPdfText,
  expectedHtmlRoutes,
  expectedProjects,
  parseProjectDocument,
  projectCoverKinds,
  projectCoverTones,
  routeForHtmlRelativePath,
  validateProjectCollection,
  validatePublicAssets,
  validateSourcePrivacy
} from "../../scripts/audit-public.mjs";
import { PROJECT_DETAIL_MEDIA, PROJECT_DETAIL_VARIANTS, PROJECT_MEDIA_VARIANTS } from "../../scripts/project-media.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const detailMedia = PROJECT_DETAIL_MEDIA as Record<string, readonly { id: string; source: string }[]>;

describe("public project contract", () => {
  it("keeps the exact nine projects in the approved order and tiers", async () => {
    await expect(validateProjectCollection(root)).resolves.toEqual([]);
    expect(expectedProjects.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(expectedProjects.slice(0, 3).every(({ tier }) => tier === "featured")).toBe(true);
    expect(expectedProjects[3]).toMatchObject({ slug: "plushome", tier: "supporting" });
    expect(expectedProjects.slice(4).every(({ tier }) => tier === "archive")).toBe(true);
  });

  it("gives every published metric a scope and evidence", async () => {
    for (const { slug } of expectedProjects) {
      const text = await readFile(path.join(root, "src", "content", "projects", `${slug}.md`), "utf8");
      const project = parseProjectDocument(text, slug);
      for (const metric of project.metrics) {
        expect(["personal", "team"]).toContain(metric.scope);
        expect(metric.evidence.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("uses a source-backed structured cover contract for all nine projects", async () => {
    const topKinds = new Set<string>();
    for (const { slug, order } of expectedProjects) {
      const text = await readFile(path.join(root, "src", "content", "projects", `${slug}.md`), "utf8");
      const project = parseProjectDocument(text, slug);
      expect(project.cover).not.toBeTypeOf("string");
      if (!project.cover || typeof project.cover === "string") continue;

      const { kind, tone, alt, evidence } = project.cover;
      expect(kind).toBeDefined();
      expect(tone).toBeDefined();
      expect(alt).toBeDefined();
      expect(evidence?.source).toBeDefined();
      if (!kind || !tone || !alt || !evidence?.source) continue;

      expect(projectCoverKinds.has(kind)).toBe(true);
      expect(projectCoverTones.has(tone)).toBe(true);
      expect(alt.trim().length).toBeGreaterThan(0);
      expect(["metric", "action", "outcome", "role", "limitation"]).toContain(evidence.source);
      if (["metric", "action", "outcome"].includes(evidence.source)) {
        expect(Number.isInteger(evidence.index)).toBe(true);
      } else {
        expect(evidence.index).toBeUndefined();
      }
      if (order <= 3) topKinds.add(kind);
    }
    expect(topKinds.size).toBe(3);
  });

  it("defines every responsive and social project cover variant", () => {
    expect(Object.keys(PROJECT_MEDIA_VARIANTS)).toEqual([
      "cover.webp",
      "cover-960w.webp",
      "cover-480w.webp",
      "cover-mobile.webp",
      "cover-mobile-480w.webp",
      "cover-og.webp"
    ]);
  });

  it("keeps detail gallery content aligned with responsive generated media", async () => {
    expect(Object.keys(PROJECT_DETAIL_VARIANTS)).toEqual([".webp", "-960w.webp", "-480w.webp"]);
    for (const { slug } of expectedProjects) {
      const text = await readFile(path.join(root, "src", "content", "projects", `${slug}.md`), "utf8");
      const project = parseProjectDocument(text, slug);
      expect(project.visuals.map(({ id }) => id)).toEqual((detailMedia[slug] ?? []).map(({ id }) => id));
      for (const visual of project.visuals) {
        expect(visual.alt.trim().length).toBeGreaterThan(0);
        expect(visual.caption.trim().length).toBeGreaterThan(0);
        expect(["personal", "team"]).toContain(visual.scope);
        expect(visual.evidence.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the public information architecture contracts visible in source", async () => {
    const [home, projectIndex, projectDetail, resume, header, footer] = await Promise.all([
      readFile(path.join(root, "src", "pages", "index.astro"), "utf8"),
      readFile(path.join(root, "src", "pages", "projects", "index.astro"), "utf8"),
      readFile(path.join(root, "src", "pages", "projects", "[slug].astro"), "utf8"),
      readFile(path.join(root, "src", "pages", "resume", "index.astro"), "utf8"),
      readFile(path.join(root, "src", "components", "Header.astro"), "utf8"),
      readFile(path.join(root, "src", "components", "Footer.astro"), "utf8")
    ]);

    expect(home).toContain("HajaCheck 사례 보기");
    expect(projectIndex).toContain('eager={index === 0}');
    expect(projectDetail).toContain("전체 프로젝트");
    expect(projectDetail).not.toContain("노출 등급");
    expect(resume).toContain('id="experience"');
    expect(resume).not.toContain("resume-sidebar");
    expect(header).toContain("aria-current");
    for (const label of ["이메일", "GitHub", "PDF 이력서", "오픈소스 고지"]) expect(footer).toContain(label);
  });

  it("keeps only allowed public asset types and an available public resume", async () => {
    await expect(validatePublicAssets(root)).resolves.toEqual([]);
  });

  it("extracts and audits selectable text from the public resume PDF", async () => {
    const resumePath = path.join(root, "public", "resume", "resume.pdf");
    const resumeText = await extractPdfText(resumePath);
    expect(resumeText.trim().length).toBeGreaterThan(100);
    expect(resumeText).toContain(approvedEmail);
    expect(auditText(resumeText, "resume text")).toEqual([]);
  });
});

describe("privacy audit", () => {
  it("accepts the approved public email", () => {
    expect(auditText(`Contact: ${approvedEmail}`)).toEqual([]);
  });

  it("rejects internal markers, private emails, local paths, and sensitive identifiers", () => {
    const privateEmail = ["private", "example.test"].join("@");
    const internalMarker = ["TO", "DO"].join("");
    const excludedArchive = ["Study", "Files"].join("");
    const localPath = ["C", ":", "\\", "private", "\\", "record.txt"].join("");
    const mobileNumber = ["010", "1234", "5678"].join("-");
    const text = `${privateEmail}\n${internalMarker}\n${excludedArchive}\n${localPath}\n${mobileNumber}`;
    expect(auditText(text).length).toBeGreaterThanOrEqual(4);
  });

  it("finds no private content in repository text files", async () => {
    await expect(validateSourcePrivacy(root)).resolves.toEqual([]);
  });
});

describe("route contract", () => {
  it("contains direct routes for every project, resume, and the static not found page", () => {
    const routes = expectedHtmlRoutes();
    expect(routes).toContain("/");
    expect(routes).toContain("/projects/");
    expect(routes).toContain("/resume/");
    expect(routes).toContain("/404.html");
    for (const { slug } of expectedProjects) expect(routes).toContain(`/projects/${slug}/`);
  });

  it("maps generated HTML files to canonical paths", () => {
    expect(routeForHtmlRelativePath("index.html")).toBe("/");
    expect(routeForHtmlRelativePath(path.join("projects", "index.html"))).toBe("/projects/");
    expect(routeForHtmlRelativePath(path.join("projects", "hajacheck", "index.html"))).toBe("/projects/hajacheck/");
    expect(routeForHtmlRelativePath("404.html")).toBe("/404.html");
  });
});
