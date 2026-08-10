import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(projectRoot, "dist");
const browserProfile = path.join(projectRoot, "tmp", "lighthouse-profile");
const host = "127.0.0.1";
const port = 4323;

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"]
]);

function browserPath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform !== "win32") return undefined;
  const bases = [process.env["ProgramFiles(x86)"], process.env.ProgramW6432].filter(Boolean);
  const candidates = bases.flatMap((base) => [
    path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(base, "Google", "Chrome", "Application", "chrome.exe")
  ]);
  return candidates.find((candidate) => existsSync(candidate));
}

async function resolveRequest(requestUrl = "/") {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, `http://${host}`).pathname);
  } catch {
    return undefined;
  }
  const relative = pathname.replace(/^\/+/, "");
  const candidates = pathname.endsWith("/")
    ? [path.join(root, relative, "index.html")]
    : [path.join(root, relative), path.join(root, relative, "index.html")];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) continue;
    try {
      if ((await stat(resolved)).isFile()) return resolved;
    } catch {
      continue;
    }
  }
  return undefined;
}

const server = createServer(async (request, response) => {
  const target = await resolveRequest(request.url);
  if (!target) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const extension = path.extname(target).toLowerCase();
  const cacheControl = extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable";
  response.writeHead(200, {
    "content-type": contentTypes.get(extension) ?? "application/octet-stream",
    "cache-control": cacheControl
  });
  response.end(await readFile(target));
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, host, resolve);
});

let chrome;
try {
  await mkdir(browserProfile, { recursive: true });
  chrome = await chromeLauncher.launch({
    chromePath: browserPath(),
    userDataDir: browserProfile,
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"]
  });
  const run = await lighthouse(`http://${host}:${port}/`, {
    port: chrome.port,
    logLevel: "error",
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
  });
  if (!run) throw new Error("Lighthouse did not return a result");

  const scores = Object.fromEntries(
    Object.entries(run.lhr.categories).map(([key, category]) => [key, Math.round((category.score ?? 0) * 100)])
  );
  const thresholds = { performance: 90, accessibility: 95, "best-practices": 95, seo: 95 };
  for (const [key, threshold] of Object.entries(thresholds)) {
    const score = scores[key] ?? 0;
    console.log(`${key}: ${score}`);
    if (score < threshold) process.exitCode = 1;
  }
  if ((scores.performance ?? 0) < thresholds.performance) {
    await writeFile(path.join(projectRoot, "tmp", "lighthouse-result.json"), JSON.stringify(run.lhr));
    const weightedAudits = run.lhr.categories.performance.auditRefs.filter((reference) => reference.weight > 0);
    for (const reference of weightedAudits) {
      const audit = run.lhr.audits[reference.id];
      console.log(`${reference.id}: ${Math.round((audit.score ?? 0) * 100)}${audit.displayValue ? `, ${audit.displayValue}` : ""}`);
    }
    const diagnostics = Object.values(run.lhr.audits)
      .filter((audit) => audit.score !== null && audit.score < 1 && audit.displayValue)
      .sort((left, right) => (right.details?.overallSavingsMs ?? 0) - (left.details?.overallSavingsMs ?? 0))
      .slice(0, 15);
    for (const audit of diagnostics) console.log(`${audit.id}: ${audit.displayValue}`);
  }
} finally {
  if (chrome) chrome.kill();
  await new Promise((resolve) => server.close(resolve));
}
