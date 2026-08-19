import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const extensionRoot = path.join(root, "src", "extension");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await walk(fullPath) : [fullPath]));
  }
  return files;
}

const files = await walk(extensionRoot);
for (const file of files.filter((candidate) => candidate.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

const manifest = JSON.parse(
  await readFile(path.join(root, "manifest.chrome.json"), "utf8"),
);
const required = ["manifest_version", "name", "version", "background", "action"];
for (const key of required) {
  if (!manifest[key]) throw new Error(`Manifest is missing ${key}`);
}

const html = files.filter((candidate) => candidate.endsWith(".html"));
for (const file of html) {
  const contents = await readFile(file, "utf8");
  if (/<script(?![^>]*\bsrc=)/i.test(contents)) {
    throw new Error(`Inline script violates extension CSP: ${file}`);
  }
}

console.log(`Checked ${files.length} extension files and manifest.chrome.json`);

