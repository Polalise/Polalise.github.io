import path from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { auditResumeSnapshot, extractPdfText } from "../../scripts/audit-public.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const snapshotPath = path.join(root, "scripts", "resume", "resume-snapshot.json");

async function loadSnapshot() {
  return JSON.parse(await readFile(snapshotPath, "utf8"));
}

describe("resume PDF staleness gate", () => {
  it("records a sha256 and a non-empty keyString contract", async () => {
    const snapshot = await loadSnapshot();
    expect(snapshot.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Array.isArray(snapshot.keyStrings)).toBe(true);
    expect(snapshot.keyStrings.length).toBeGreaterThanOrEqual(8);
  });

  it("passes when every keyString is present (whitespace-insensitive)", async () => {
    const snapshot = await loadSnapshot();
    const text = snapshot.keyStrings.map((s: string) => `... ${s} ...`).join("\n");
    await expect(auditResumeSnapshot(root, text)).resolves.toEqual([]);
  });

  it("flags a stale PDF when a keyString is missing", async () => {
    const errors = await auditResumeSnapshot(root, "관련 없는 본문 텍스트");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((message) => message.includes("stale"))).toBe(true);
  });

  it("matches the committed public resume PDF", async () => {
    const resumeText = await extractPdfText(path.join(root, "public", "resume", "resume.pdf"));
    await expect(auditResumeSnapshot(root, resumeText)).resolves.toEqual([]);
  });
});
