import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const forbiddenTokens = [
  "text-light-",
  "bg-dark-",
  "card-border",
  "card-interview",
  "btn-primary",
  "btn-secondary",
  "badge-text",
];

const hexAllowList = new Set([
  "app/layout.tsx",
  "components/layout/Container.tsx",
]);
const hexColorPattern = /#[0-9a-fA-F]{3,8}\b/g;

const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!EXTENSIONS.has(path.extname(fullPath))) {
      continue;
    }

    files.push(fullPath);
  }
}

for (const root of ROOTS) {
  walk(root);
}

const legacyViolations = [];
const hexViolations = [];

for (const filePath of files) {
  const relPath = filePath.split(path.sep).join("/");
  const source = readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const token of forbiddenTokens) {
      if (line.includes(token)) {
        legacyViolations.push(`${relPath}:${index + 1} -> ${token}`);
      }
    }

    if (hexAllowList.has(relPath)) {
      return;
    }

    const hexMatches = line.match(hexColorPattern);
    if (hexMatches) {
      for (const value of hexMatches) {
        hexViolations.push(`${relPath}:${index + 1} -> ${value}`);
      }
    }
  });
}

if (legacyViolations.length > 0) {
  console.error("Legacy style token/class usage detected:");
  for (const violation of legacyViolations) {
    console.error(`  - ${violation}`);
  }
}

if (hexViolations.length > 0) {
  console.error("Hardcoded hex color detected in source files:");
  for (const violation of hexViolations) {
    console.error(`  - ${violation}`);
  }
}

if (legacyViolations.length > 0 || hexViolations.length > 0) {
  process.exit(1);
}

process.stdout.write("Style guards passed.\n");
