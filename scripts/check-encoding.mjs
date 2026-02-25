import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "docs", "tests"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md", ".json", ".yml"]);
const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".git", "playwright-report", "test-results"]);

const suspiciousCharPattern = /[ЂЃЄЅІЇЈЉЊЋЌЎЏђѓєѕіїјљњћќўџ�]/u;
const repeatedMojibakePattern = /(?:Р[А-Яа-яЁё]|С[А-Яа-яЁё]){3,}/u;

function hasTextExtension(path) {
  for (const ext of TEXT_EXTENSIONS) {
    if (path.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

async function walk(path, output) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = join(path, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      await walk(nextPath, output);
      continue;
    }
    if (!hasTextExtension(nextPath)) {
      continue;
    }
    output.push(nextPath);
  }
}

function formatFinding(path, lineIndex, line) {
  const trimmed = line.trim();
  const preview = trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
  return `${relative(ROOT, path)}:${lineIndex + 1}: ${preview}`;
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    await walk(join(ROOT, dir), files);
  }

  const findings = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const lines = content.split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (suspiciousCharPattern.test(line) || repeatedMojibakePattern.test(line)) {
        findings.push(formatFinding(file, index, line));
      }
    });
  }

  if (findings.length > 0) {
    console.error("Encoding check failed. Potential mojibake found:");
    findings.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }

  console.log(`Encoding check passed (${files.length} files scanned).`);
}

void main();

