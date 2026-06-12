import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const realRootDir = realpathSync(rootDir);
process.chdir(realRootDir);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: realRootDir,
    stdio: "inherit"
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform === "win32") {
  run("cmd.exe", ["/d", "/s", "/c", "npx expo export --platform web"]);
} else {
  run("npx", ["expo", "export", "--platform", "web"]);
}
run(process.execPath, ["scripts/generateSeoPages.mjs"]);
