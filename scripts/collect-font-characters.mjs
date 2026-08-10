import { readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(os.tmpdir(), "polalise-portfolio-font-characters.txt");
const roots = [path.join(projectRoot, "src"), path.join(projectRoot, "dist")];
const textExtensions = new Set([".astro", ".css", ".html", ".js", ".json", ".md", ".mjs", ".ts"]);

async function textFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return textFiles(target);
      return entry.isFile() && textExtensions.has(path.extname(entry.name)) ? [target] : [];
    })
  );
  return nested.flat();
}

const files = (await Promise.all(roots.map((root) => textFiles(root)))).flat();
const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
const characters = [...new Set(source.normalize("NFC"))].sort().join("");

await writeFile(outputPath, characters, "utf8");
console.log(`Collected ${characters.length} unique characters from ${files.length} text files.`);
console.log(outputPath);
