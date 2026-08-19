import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const output = path.join(root, "dist", "chrome");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "src", "extension"), output, { recursive: true });

const manifest = JSON.parse(
  await readFile(path.join(root, "manifest.chrome.json"), "utf8"),
);
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
manifest.version = pkg.version;
await writeFile(
  path.join(output, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Built Chrome extension at ${path.relative(root, output)}`);

