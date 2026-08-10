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
  routeForHtmlRelativePath,
  validateProjectCollection,
  validatePublicAssets,
  validateSourcePrivacy
} from "../../scripts/audit-public.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");

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
