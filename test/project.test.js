import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs } from "../src/cli.js";
import {
  applyTemplate,
  commandFor,
  convexPackages,
  detectPackageManager,
  developmentPackages,
  ensureAvailableTarget,
  expoPackages,
  generatedPackagesToRemove,
  nativeWindDevelopmentPackages,
  nativeWindPackages,
  patchAppJson,
  patchPackageJson,
  setupNativeWind,
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
    [
      "--yes",
      "create-expo-app@latest",
      "/tmp/my-app",
      "--template",
      "blank-typescript",
      "--yes",
      "--no-install",
    ],
  ]);
});

test("dependency groups keep NativeWind, Expo, development tools, and Convex separate", () => {
  assert.deepEqual(convexPackages, ["convex"]);
  assert.deepEqual(nativeWindPackages, [
    "nativewind@4.2.7",
    "react-native-reanimated@~4.5.1",
    "react-native-worklets@0.10.1",
    "react-native-safe-area-context@~5.7.0",
  ]);
  assert.deepEqual(nativeWindDevelopmentPackages, [
    "tailwindcss@^3.4.17",
    "prettier-plugin-tailwindcss@^0.5.11",
    "babel-preset-expo",
  ]);
  assert.deepEqual(developmentPackages, ["@biomejs/biome@2.5.14"]);
  assert.equal(expoPackages.includes("convex"), false);
  assert.equal(expoPackages.includes("nativewind@4.2.7"), false);
  assert.equal(expoPackages.includes("@expo/vector-icons"), true);
  assert.equal(expoPackages.includes("expo-splash-screen"), true);
});

test("pnpm Convex installs approve the esbuild build", () => {
  assert.deepEqual(commandFor("pnpm", "add", ["convex"]), [
    "pnpm",
    ["add", "convex", "--allow-build=esbuild"],
  ]);
});

test("add and Expo install accept an optional development flag", () => {
  assert.deepEqual(commandFor("pnpm", "add", ["tailwindcss"], true), [
    "pnpm",
    ["add", "--save-dev", "tailwindcss"],
  ]);
  assert.deepEqual(commandFor("pnpm", "expo-install", ["expo-router"]), [
    "pnpm",
    ["exec", "expo", "install", "expo-router"],
  ]);
  assert.deepEqual(commandFor("pnpm", "expo-install", ["typescript"], true), [
    "pnpm",
    ["exec", "expo", "install", "--dev", "typescript"],
  ]);
});

test("other package managers install Convex directly", () => {
  assert.deepEqual(commandFor("npm", "add", ["convex"]), ["npm", ["install", "convex"]]);
  assert.deepEqual(commandFor("yarn", "add", ["convex"]), ["yarn", ["add", "convex"]]);
  assert.deepEqual(commandFor("bun", "add", ["convex"]), ["bun", ["add", "convex"]]);
});

test("tailwind initialization uses the selected package manager", () => {
  assert.deepEqual(commandFor("pnpm", "tailwind-init"), ["pnpm", ["exec", "tailwindcss", "init"]]);
});

test("generated cleanup preserves status bar, splash screen, and font packages", () => {
  assert.equal(generatedPackagesToRemove.includes("expo-status-bar"), false);
  assert.equal(generatedPackagesToRemove.includes("expo-splash-screen"), false);
  assert.equal(generatedPackagesToRemove.includes("expo-font"), false);
  assert.equal(generatedPackagesToRemove.includes("react-native-web"), true);
});

test("project directory names are valid Expo slugs", () => {
  assert.throws(() => ensureAvailableTarget("/tmp/my.app"), /letters, numbers/);
});

test("NativeWind and starter setup replace the blank Expo scaffold", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "create-expo-convex-app-"));
  writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ scripts: { web: "expo start --web", "reset-project": "reset" } }),
  );
  writeFileSync(path.join(directory, "App.tsx"), "export default function App() {}\n");
  writeFileSync(path.join(directory, "index.ts"), "export {};\n");
  writeFileSync(
    path.join(directory, "app.json"),
    JSON.stringify({
      expo: {
        name: "demo",
        web: { output: "static" },
        plugins: [["expo-splash-screen", { image: "splash.png" }]],
      },
    }),
  );

  setupNativeWind(directory);
  const nativeWindAppJson = JSON.parse(readFileSync(path.join(directory, "app.json"), "utf8"));
  assert.equal(nativeWindAppJson.expo.web.bundler, "metro");
  assert.equal(existsSync(path.join(directory, "babel.config.js")), true);
  assert.equal(existsSync(path.join(directory, "nativewind-env.d.ts")), true);

  applyTemplate(directory);
  patchPackageJson(directory);
  patchAppJson(directory);

  const packageJson = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  const appJson = JSON.parse(readFileSync(path.join(directory, "app.json"), "utf8"));
  assert.equal(packageJson.main, "expo-router/entry");
  assert.equal(packageJson.scripts.web, undefined);
  assert.equal(packageJson.scripts["reset-project"], undefined);
  assert.equal(packageJson.scripts.check, "biome check .");
  assert.deepEqual(appJson.expo.platforms, ["ios", "android"]);
  assert.equal(appJson.expo.web, undefined);
  assert.deepEqual(appJson.expo.plugins, [
    "expo-router",
    ["expo-splash-screen", { image: "splash.png" }],
  ]);
  assert.equal(existsSync(path.join(directory, "App.tsx")), false);
  assert.equal(existsSync(path.join(directory, "index.ts")), false);
  assert.equal(existsSync(path.join(directory, "src/app/index.tsx")), true);
});
