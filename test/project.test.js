import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs } from "../src/cli.js";
import {
  commandFor,
  detectPackageManager,
  ensureAvailableTarget,
  patchAppJson,
  patchPackageJson,
} from "../src/project.js";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("git installs do not require package lifecycle scripts", () => {
  for (const script of ["prepack", "prepare", "prepublish"]) {
    assert.equal(packageJson.scripts[script], undefined);
  }
  assert.equal(packageJson.scripts.prepublishOnly, "npm run verify");
});

test("detectPackageManager understands npm user agents", () => {
  assert.equal(detectPackageManager("pnpm/10.0.0 npm/? node/v22"), "pnpm");
  assert.equal(detectPackageManager("bun/1.2.0 npm/? node/v22"), "bun");
  assert.equal(detectPackageManager(""), "npm");
});

test("parseArgs reads the project and options", () => {
  assert.deepEqual(parseArgs(["my-app", "--package-manager", "pnpm", "--skip-convex"]), {
    directory: "my-app",
    packageManager: "pnpm",
    skipConvex: true,
    help: false,
    version: false,
  });
});

test("commandFor always requests the latest Expo scaffold", () => {
  assert.deepEqual(commandFor("npm", "create", ["/tmp/my-app"]), [
    "npx",
    ["--yes", "create-expo-app@latest", "/tmp/my-app", "--yes"],
  ]);
});

test("pnpm Expo installs approve the esbuild build", () => {
  assert.deepEqual(commandFor("pnpm", "expo-install", ["convex"]), [
    "pnpm",
    ["exec", "expo", "install", "convex", "--", "--allow-build=esbuild"],
  ]);
  assert.deepEqual(commandFor("pnpm", "expo-install-dev", ["typescript"]), [
    "pnpm",
    ["exec", "expo", "install", "--dev", "typescript", "--", "--allow-build=esbuild"],
  ]);
});

test("other package managers do not receive pnpm build options", () => {
  assert.deepEqual(commandFor("npm", "expo-install", ["convex"]), [
    "npx",
    ["expo", "install", "convex"],
  ]);
});

test("project directory names are valid Expo slugs", () => {
  assert.throws(() => ensureAvailableTarget("/tmp/my.app"), /letters, numbers/);
});

test("package and app config patches remove web support and add scripts", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "create-expo-convex-app-"));
  writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ scripts: { web: "expo start --web", "reset-project": "reset" } }),
  );
  writeFileSync(
    path.join(directory, "app.json"),
    JSON.stringify({
      expo: {
        name: "demo",
        web: { output: "static" },
        plugins: ["expo-router", ["expo-splash-screen", { image: "splash.png" }]],
      },
    }),
  );

  patchPackageJson(directory);
  patchAppJson(directory);

  const packageJson = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  const appJson = JSON.parse(readFileSync(path.join(directory, "app.json"), "utf8"));
  assert.equal(packageJson.scripts.web, undefined);
  assert.equal(packageJson.scripts["reset-project"], undefined);
  assert.equal(packageJson.scripts.check, "biome check .");
  assert.deepEqual(appJson.expo.platforms, ["ios", "android"]);
  assert.equal(appJson.expo.web, undefined);
  assert.deepEqual(appJson.expo.plugins, ["expo-router"]);
});
