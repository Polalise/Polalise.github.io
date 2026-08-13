import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateProjectMedia } from "./project-media.mjs";

export const siteOrigin = "https://polalise.github.io";
export const approvedEmail = "qudgus182@naver.com";

export const expectedProjects = [
  { slug: "hajacheck", order: 1, tier: "featured" },
  { slug: "ml-economics-answers", order: 2, tier: "featured" },
  { slug: "machine-learning-oil", order: 3, tier: "featured" },
  { slug: "plushome", order: 4, tier: "supporting" },
  { slug: "deep-learning-sleep", order: 5, tier: "archive" },
  { slug: "advanced-project", order: 6, tier: "archive" },
  { slug: "pet-platform-project", order: 7, tier: "archive" },
  { slug: "project-final", order: 8, tier: "archive" },
  { slug: "bmi-calculator", order: 9, tier: "archive" }
];

export const projectCoverKinds = new Set([
  "workflow",
  "routing",
  "product",
  "validation",
  "architecture",
  "scope"
]);

export const projectCoverTones = new Set(["paper", "ink", "accent"]);
export const projectCoverEvidenceSources = new Set(["metric", "action", "outcome", "role", "limitation"]);

const textExtensions = new Set([
  ".astro",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".toml",
  ".ts",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

const ignoredSourceDirectories = new Set([
  ".astro",
  ".cache",
  ".git",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
  "tmp"
]);

const forbiddenTerms = [
  ["Study", "Files"].join(""),
  ["TO", "DO"].join(""),
  ["profile", "private"].join(".")
];

const sensitivePatterns = [
  {
    label: "Korean mobile number",
    pattern: /(?<!\d)01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}(?!\d)/g
  },
  {
    label: "Korean resident identifier",
    pattern: /(?<!\d)\d{6}[\s-]?[1-4]\d{6}(?!\d)/g
  },
  {
    label: "street address",
    pattern: /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|도|특별자치도)?\s+[가-힣0-9]+(?:시|군|구)\s+[가-힣0-9.-]+(?:로|길)\s*\d+/g
  }
];

const dangerousPublicExtensions = new Set([
  ".7z",
  ".csv",
  ".doc",
  ".docx",
  ".h5",
  ".ipynb",
  ".joblib",
  ".onnx",
  ".parquet",
  ".pickle",
  ".pkl",
  ".ppt",
  ".pptx",
  ".pt",
  ".pth",
  ".sql",
  ".tsv",
  ".xls",
  ".xlsx",
  ".zip"
]);

function cleanScalar(value = "") {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function scalarFromFrontmatter(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  return match ? cleanScalar(match[1]) : undefined;
}

function blockFromFrontmatter(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return [];

  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) break;
    block.push(lines[index]);
  }
  return block;
}

function listFromFrontmatter(frontmatter, key) {
  return blockFromFrontmatter(frontmatter, key)
    .map((line) => line.match(/^\s{2}-\s+(.*?)\s*$/)?.[1])
    .filter(Boolean)
    .map(cleanScalar);
}

function parseCover(frontmatter) {
  const block = blockFromFrontmatter(frontmatter, "cover");
  if (block.length === 0) return scalarFromFrontmatter(frontmatter, "cover");

  const property = (key, indent = 2) => {
    const expression = new RegExp(`^\\s{${indent}}${key}:\\s*(.*?)\\s*$`);
    const match = block.map((line) => line.match(expression)).find(Boolean);
    return match ? cleanScalar(match[1]) : undefined;
  };
  const rawIndex = property("index", 4);

  return {
    kind: property("kind"),
    tone: property("tone"),
    alt: property("alt"),
    evidence: {
      source: property("source", 4),
      index: rawIndex === undefined ? undefined : Number(rawIndex)
    }
  };
}

export function parseProjectDocument(text, slug = "unknown") {
  if (!text.startsWith("---")) {
    throw new Error(`${slug}: frontmatter opening marker is missing`);
  }

  const closingIndex = text.indexOf("\n---", 3);
  if (closingIndex < 0) {
    throw new Error(`${slug}: frontmatter closing marker is missing`);
  }

  const frontmatter = text.slice(3, closingIndex).replace(/^\r?\n/, "");
  const metrics = [];
  const lines = frontmatter.split(/\r?\n/);
  let inMetrics = false;
  let currentMetric;

  for (const line of lines) {
    if (/^metrics:\s*\[\]\s*$/.test(line)) {
      inMetrics = false;
      continue;
    }
    if (/^metrics:\s*$/.test(line)) {
      inMetrics = true;
      continue;
    }
    if (inMetrics && /^\S/.test(line)) {
      inMetrics = false;
      currentMetric = undefined;
    }
    if (!inMetrics) continue;

    const valueMatch = line.match(/^\s{2}-\s+value:\s*(.*?)\s*$/);
    if (valueMatch) {
      currentMetric = { value: cleanScalar(valueMatch[1]), label: "", scope: "", evidence: "" };
      metrics.push(currentMetric);
      continue;
    }
    if (!currentMetric) continue;

    const propertyMatch = line.match(/^\s{4}(label|scope|evidence):\s*(.*?)\s*$/);
    if (propertyMatch) currentMetric[propertyMatch[1]] = cleanScalar(propertyMatch[2]);
  }

  return {
    slug,
    title: scalarFromFrontmatter(frontmatter, "title"),
    displayTitle: scalarFromFrontmatter(frontmatter, "displayTitle"),
    order: Number(scalarFromFrontmatter(frontmatter, "order")),
    tier: scalarFromFrontmatter(frontmatter, "tier"),
    ownership: scalarFromFrontmatter(frontmatter, "ownership"),
    role: scalarFromFrontmatter(frontmatter, "role"),
    limitation: scalarFromFrontmatter(frontmatter, "limitation"),
    actions: listFromFrontmatter(frontmatter, "actions"),
    outcomes: listFromFrontmatter(frontmatter, "outcomes"),
    cover: parseCover(frontmatter),
    metrics,
    frontmatter
  };
}

async function walkFiles(directory, ignoredDirectories = new Set()) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(absolutePath, ignoredDirectories)));
    if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function relativeLabel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function occurrences(text, pattern) {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)];
}

export function auditText(text, label = "text") {
  const errors = [];

  for (const term of forbiddenTerms) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`${label}: forbidden internal token found`);
    }
  }

  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  for (const match of occurrences(text, emailPattern)) {
    if (match[0].toLowerCase() !== approvedEmail) {
      errors.push(`${label}: unapproved email found`);
    }
  }

  const windowsAbsolutePath = /(?<![A-Za-z0-9])[A-Za-z]:[\\/](?![\\/])[^\s"'<>`)\]}]*/g;
  if (occurrences(text, windowsAbsolutePath).length > 0 || /file:\/\//i.test(text)) {
    errors.push(`${label}: local absolute path found`);
  }

  for (const { label: sensitiveLabel, pattern } of sensitivePatterns) {
    if (occurrences(text, pattern).length > 0) {
      errors.push(`${label}: ${sensitiveLabel} found`);
    }
  }

  if (text.includes("\u2013") || text.includes("\u2014")) {
    errors.push(`${label}: non-ASCII dash found`);
  }

  return [...new Set(errors)];
}

export async function extractPdfText(file) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await readFile(file);
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
    useWorkerFetch: false,
    verbosity: 0
  });
  const document = await loadingTask.promise;

  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean);
      pages.push(lines.join(" "));
      page.cleanup();
    }
    return pages.join("\n");
  } finally {
    await loadingTask.destroy();
  }
}

export async function validateProjectCollection(root) {
  const errors = [];
  const contentDirectory = path.join(root, "src", "content", "projects");
  let fileNames = [];

  try {
    fileNames = (await readdir(contentDirectory))
      .filter((fileName) => fileName.endsWith(".md"))
      .sort();
  } catch {
    return ["project collection directory is missing"];
  }

  const actualSlugs = fileNames.map((fileName) => path.basename(fileName, ".md"));
  const expectedSlugs = expectedProjects.map(({ slug }) => slug).sort();
  if (actualSlugs.length !== expectedProjects.length) {
    errors.push(`project count must be ${expectedProjects.length}, found ${actualSlugs.length}`);
  }
  if (JSON.stringify(actualSlugs) !== JSON.stringify(expectedSlugs)) {
    errors.push("project slugs do not match the public contract");
  }

  const documents = [];
  for (const fileName of fileNames) {
    const slug = path.basename(fileName, ".md");
    try {
      const text = await readFile(path.join(contentDirectory, fileName), "utf8");
      documents.push(parseProjectDocument(text, slug));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${slug}: could not parse project`);
    }
  }

  const orderValues = documents.map(({ order }) => order);
  if (new Set(orderValues).size !== orderValues.length) errors.push("project order values must be unique");

  for (const expected of expectedProjects) {
    const document = documents.find(({ slug }) => slug === expected.slug);
    if (!document) continue;
    if (document.order !== expected.order) {
      errors.push(`${expected.slug}: order must be ${expected.order}, found ${document.order}`);
    }
    if (document.tier !== expected.tier) {
      errors.push(`${expected.slug}: tier must be ${expected.tier}, found ${document.tier}`);
    }
    if (!document.cover || typeof document.cover === "string") {
      errors.push(`${expected.slug}: cover must use the structured cover contract`);
    } else {
      const { kind, tone, alt, evidence } = document.cover;
      if (!projectCoverKinds.has(kind)) errors.push(`${expected.slug}: invalid cover kind`);
      if (!projectCoverTones.has(tone)) errors.push(`${expected.slug}: invalid cover tone`);
      if (!alt?.trim()) errors.push(`${expected.slug}: cover alt is required`);
      if (!evidence || typeof evidence !== "object") {
        errors.push(`${expected.slug}: cover evidence is required`);
      } else if (!projectCoverEvidenceSources.has(evidence.source)) {
        errors.push(`${expected.slug}: invalid cover evidence source`);
      } else if (new Set(["metric", "action", "outcome"]).has(evidence.source)) {
        if (!Number.isInteger(evidence.index) || evidence.index < 0) {
          errors.push(`${expected.slug}: ${evidence.source} cover evidence needs a non-negative index`);
        } else {
          const values = evidence.source === "metric"
            ? document.metrics
            : evidence.source === "action"
              ? document.actions
              : document.outcomes;
          if (evidence.index >= values.length) {
            errors.push(`${expected.slug}: cover evidence index is outside ${evidence.source} bounds`);
          }
          if (
            document.ownership === "team" &&
            evidence.source === "metric" &&
            document.metrics[evidence.index]?.scope === "personal"
          ) {
            errors.push(`${expected.slug}: a team project cover cannot use a personal metric`);
          }
        }
      } else {
        if (evidence.index !== undefined) {
          errors.push(`${expected.slug}: ${evidence.source} cover evidence cannot declare an index`);
        }
        if (evidence.source === "role" && !document.role) errors.push(`${expected.slug}: role cover evidence is empty`);
        if (evidence.source === "limitation" && !document.limitation) {
          errors.push(`${expected.slug}: limitation cover evidence is empty`);
        }
      }
    }

    for (const [index, metric] of document.metrics.entries()) {
      const metricLabel = `${expected.slug}: metric ${index + 1}`;
      if (!metric.value || !metric.label) errors.push(`${metricLabel} must have a value and label`);
      if (!new Set(["personal", "team"]).has(metric.scope)) {
        errors.push(`${metricLabel} must declare personal or team scope`);
      }
      if (!metric.evidence) errors.push(`${metricLabel} must include evidence`);
    }
  }

  const sortedSlugs = documents
    .slice()
    .sort((left, right) => left.order - right.order)
    .map(({ slug }) => slug);
  if (JSON.stringify(sortedSlugs) !== JSON.stringify(expectedProjects.map(({ slug }) => slug))) {
    errors.push("project display order does not match the public contract");
  }

  return errors;
}

export async function validateSourcePrivacy(root) {
  const errors = [];
  const files = await walkFiles(root, ignoredSourceDirectories);

  for (const file of files) {
    if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
    const text = await readFile(file, "utf8");
    errors.push(...auditText(text, relativeLabel(root, file)));
  }

  return errors;
}

export async function validatePublicAssets(root) {
  const errors = [];
  const publicDirectory = path.join(root, "public");
  const files = await walkFiles(publicDirectory);

  for (const file of files) {
    const relativePath = relativeLabel(publicDirectory, file);
    const extension = path.extname(file).toLowerCase();
    if (dangerousPublicExtensions.has(extension)) {
      errors.push(`public/${relativePath}: unsafe public asset type`);
    }
    if (extension === ".pdf" && relativePath !== "resume/resume.pdf") {
      errors.push(`public/${relativePath}: only the public resume PDF is allowed`);
    }
  }

  const resumePath = path.join(publicDirectory, "resume", "resume.pdf");
  try {
    const resumeStat = await stat(resumePath);
    if (!resumeStat.isFile() || resumeStat.size < 1_000) {
      errors.push("public resume PDF is empty or missing");
    } else {
      try {
        const resumeText = await extractPdfText(resumePath);
        if (!resumeText.trim()) errors.push("public resume PDF has no selectable text");
        errors.push(...auditText(resumeText, "public/resume/resume.pdf text"));
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown extraction error";
        errors.push(`public resume PDF text extraction failed: ${detail}`);
      }
    }
  } catch {
    errors.push("public resume PDF is missing");
  }

  const projectErrors = await validateProjectCollection(root);
  errors.push(...projectErrors);
  errors.push(...(await validateProjectMedia(root)));

  return errors;
}

export function routeForHtmlRelativePath(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  if (normalized === "index.html") return "/";
  if (normalized === "404.html") return "/404.html";
  if (normalized.endsWith("/index.html")) return `/${normalized.slice(0, -"index.html".length)}`;
  return `/${normalized}`;
}

function extractAttribute(tag, attribute) {
  const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "").replaceAll("&amp;", "&") : undefined;
}

function extractInternalReferences(html, currentRoute) {
  const references = [];
  const tags = html.match(/<(?:a|img|link|script|source)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    for (const attribute of ["href", "src"]) {
      const value = extractAttribute(tag, attribute);
      if (value) references.push({ value, currentRoute });
    }
    const srcset = extractAttribute(tag, "srcset");
    if (srcset) {
      for (const candidate of srcset.split(",")) {
        const value = candidate.trim().split(/\s+/)[0];
        if (value) references.push({ value, currentRoute });
      }
    }
  }

  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const property = extractAttribute(tag, "property");
    if (property === "og:image") {
      const value = extractAttribute(tag, "content");
      if (value) references.push({ value, currentRoute });
    }
  }
  return references;
}

function internalUrl(value, currentRoute) {
  if (/^(?:mailto|tel|javascript|data):/i.test(value) || value.startsWith("//")) return undefined;
  try {
    const url = new URL(value, `${siteOrigin}${currentRoute}`);
    return url.origin === siteOrigin ? url : undefined;
  } catch {
    return undefined;
  }
}

async function pathExists(candidate) {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

async function resolveBuiltTarget(distDirectory, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relativePath = decodedPath.replace(/^\/+/, "");
  const candidates = [];
  if (decodedPath.endsWith("/")) candidates.push(path.join(distDirectory, relativePath, "index.html"));
  else {
    candidates.push(path.join(distDirectory, relativePath));
    candidates.push(path.join(distDirectory, `${relativePath}.html`));
    candidates.push(path.join(distDirectory, relativePath, "index.html"));
  }
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return undefined;
}

function idsInHtml(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    ids.add(match[1] ?? match[2]);
  }
  return ids;
}

export function expectedHtmlRoutes() {
  return [
    "/",
    "/projects/",
    ...expectedProjects.map(({ slug }) => `/projects/${slug}/`),
    "/resume/",
    "/404.html"
  ];
}

export async function validateBuiltSite(root) {
  const errors = [];
  const distDirectory = path.join(root, "dist");
  const requiredRoutes = expectedHtmlRoutes();

  for (const route of [...requiredRoutes, "/resume/resume.pdf"]) {
    if (!(await resolveBuiltTarget(distDirectory, route))) errors.push(`${route}: required build output is missing`);
  }

  const files = await walkFiles(distDirectory);
  const htmlFiles = files.filter((file) => path.extname(file).toLowerCase() === ".html");
  const htmlByPath = new Map();
  for (const file of htmlFiles) htmlByPath.set(file, await readFile(file, "utf8"));

  for (const [file, html] of htmlByPath) {
    const relativePath = path.relative(distDirectory, file);
    const route = routeForHtmlRelativePath(relativePath);
    const label = `dist/${relativeLabel(distDirectory, file)}`;
    errors.push(...auditText(html, label));

    if (!/<html\b[^>]*\blang=["']ko["']/i.test(html)) errors.push(`${label}: html language must be ko`);
    if ((html.match(/<h1\b/gi) ?? []).length !== 1) errors.push(`${label}: exactly one h1 is required`);
    if (!/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']+["']/i.test(html)) {
      errors.push(`${label}: meta description is missing`);
    }

    const requiredSocialMeta = [
      ["property", "og:image:alt"],
      ["property", "og:image:width"],
      ["property", "og:image:height"],
      ["name", "twitter:image:alt"]
    ];
    for (const [attribute, value] of requiredSocialMeta) {
      const pattern = new RegExp(
        `<meta\\b(?=[^>]*\\b${attribute}=["']${value}["'])(?=[^>]*\\bcontent=["'][^"']+["'])[^>]*>`,
        "i"
      );
      if (!pattern.test(html)) errors.push(`${label}: ${value} metadata is missing`);
    }

    const canonicalTags = (html.match(/<link\b[^>]*>/gi) ?? []).filter(
      (tag) => extractAttribute(tag, "rel")?.toLowerCase() === "canonical"
    );
    if (canonicalTags.length !== 1) {
      errors.push(`${label}: exactly one canonical link is required`);
    } else {
      const canonical = extractAttribute(canonicalTags[0], "href");
      if (canonical !== `${siteOrigin}${route}`) {
        errors.push(`${label}: canonical must be ${siteOrigin}${route}`);
      }
    }

    for (const reference of extractInternalReferences(html, route)) {
      const url = internalUrl(reference.value, reference.currentRoute);
      if (!url) continue;
      const targetFile = await resolveBuiltTarget(distDirectory, url.pathname);
      if (!targetFile) {
        errors.push(`${label}: broken internal reference ${reference.value}`);
        continue;
      }
      if (url.hash && path.extname(targetFile).toLowerCase() === ".html") {
        const targetHtml = htmlByPath.get(targetFile) ?? (await readFile(targetFile, "utf8"));
        let fragment;
        try {
          fragment = decodeURIComponent(url.hash.slice(1));
        } catch {
          fragment = url.hash.slice(1);
        }
        if (fragment && !idsInHtml(targetHtml).has(fragment)) {
          errors.push(`${label}: missing fragment target ${reference.value}`);
        }
      }
    }
  }

  const sitemapFiles = files.filter((file) => /^sitemap.*\.xml$/i.test(path.basename(file)));
  if (sitemapFiles.length === 0) {
    errors.push("sitemap build output is missing");
  } else {
    const pageLocations = new Set();
    for (const file of sitemapFiles) {
      const xml = await readFile(file, "utf8");
      errors.push(...auditText(xml, `dist/${relativeLabel(distDirectory, file)}`));
      for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/gi)) {
        const url = new URL(match[1]);
        if (url.origin !== siteOrigin) errors.push(`sitemap contains a foreign origin: ${match[1]}`);
        if (url.pathname.endsWith(".xml")) {
          if (!(await resolveBuiltTarget(distDirectory, url.pathname))) {
            errors.push(`sitemap index target is missing: ${url.pathname}`);
          }
        } else {
          pageLocations.add(url.pathname);
        }
      }
    }

    const expectedSitemapRoutes = new Set(requiredRoutes.filter((route) => route !== "/404.html"));
    for (const route of expectedSitemapRoutes) {
      if (!pageLocations.has(route)) errors.push(`sitemap is missing ${route}`);
    }
    for (const route of pageLocations) {
      if (!expectedSitemapRoutes.has(route)) errors.push(`sitemap has an unexpected route ${route}`);
    }
  }

  return errors;
}

export async function runAudit(root, { includeDist = true } = {}) {
  const errors = [
    ...(await validateSourcePrivacy(root)),
    ...(await validatePublicAssets(root))
  ];

  const distDirectory = path.join(root, "dist");
  let distExists = false;
  try {
    distExists = (await stat(distDirectory)).isDirectory();
  } catch {
    distExists = false;
  }
  if (includeDist && distExists) errors.push(...(await validateBuiltSite(root)));

  return {
    errors: [...new Set(errors)],
    checkedDist: includeDist && distExists
  };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await runAudit(root);
  if (result.errors.length > 0) {
    console.error(`Public audit failed with ${result.errors.length} error(s):`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Public audit passed for source${result.checkedDist ? " and build output" : ""}.`);
}

const executedFile = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (executedFile === import.meta.url) await main();
