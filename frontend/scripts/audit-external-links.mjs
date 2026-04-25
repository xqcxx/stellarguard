import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const EXTENSIONS = new Set([".tsx", ".jsx", ".ts", ".js"]);
const TARGET_BLANK_PATTERN = /target\s*=\s*["']_blank["']/g;
const REL_PATTERN = /rel\s*=\s*["']([^"']*)["']/i;
const SKIP_FILES = new Set([path.join("components", "SecureExternalLink.tsx")]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateTargetBlank(filePath, content) {
  const lines = content.split("\n");
  const violations = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!TARGET_BLANK_PATTERN.test(line)) continue;

    TARGET_BLANK_PATTERN.lastIndex = 0;

    const relMatch = line.match(REL_PATTERN);
    if (!relMatch) {
      violations.push(`${filePath}:${index + 1} missing rel for target=\"_blank\"`);
      continue;
    }

    const relValue = relMatch[1].toLowerCase();
    const hasNoopener = relValue.includes("noopener");
    const hasNoreferrer = relValue.includes("noreferrer");

    if (!hasNoopener || !hasNoreferrer) {
      violations.push(
        `${filePath}:${index + 1} rel must include both noopener and noreferrer (found: ${relMatch[1]})`
      );
    }
  }

  return violations;
}

const files = walk(ROOT);
const violations = [];

for (const filePath of files) {
  const relativeFilePath = path.relative(ROOT, filePath);
  if (SKIP_FILES.has(relativeFilePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  violations.push(...validateTargetBlank(filePath, content));
}

if (violations.length > 0) {
  console.error("External link audit failed:\n");
  for (const issue of violations) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("External link audit passed.");
