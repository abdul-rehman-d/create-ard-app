import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

/** @typedef {"npm" | "pnpm" | "yarn" | "bun"} PackageManager */
/** @typedef {"create" | "add" | "expo-install" | "tailwind-init" | "remove" | "convex" | "biome"} CommandAction */
/** @typedef {[string, string[]]} Command */

export const convexPackages = ["convex"];

export const nativeWindPackages = [
  "nativewind@4.2.7",
  "react-native-reanimated@4.5.1",
  "react-native-worklets@0.10.1",
  "react-native-safe-area-context@~5.7.0",
];

export const nativeWindDevelopmentPackages = [
  "tailwindcss@^3.4.17",
  "prettier-plugin-tailwindcss@^0.5.11",
  "babel-preset-expo",
];

export const expoPackages = [
  "expo-router",
  "expo-linking",
  "expo-constants",
  "expo-font",
  "expo-splash-screen",
  "expo-status-bar",
  "@expo/vector-icons",
  "@react-native-async-storage/async-storage",
  "@react-native-community/netinfo",
  "@tanstack/react-form",
  "react-native-gesture-handler",
  "react-native-screens",
];

export const developmentPackages = ["@biomejs/biome@2.5.14"];

export const generatedPackagesToRemove = [
  "expo-device",
  "expo-glass-effect",
  "expo-image",
  "expo-symbols",
  "expo-system-ui",
  "expo-web-browser",
  "react-dom",
  "react-native-web",
];

/** @returns {PackageManager} */
export function detectPackageManager(userAgent = process.env.npm_config_user_agent ?? "") {
  const name = userAgent.split("/")[0];
  return PACKAGE_MANAGERS.has(name) ? /** @type {PackageManager} */ (name) : "npm";
}

/** @param {string} packageManager @returns {asserts packageManager is PackageManager} */
export function assertPackageManager(packageManager) {
  if (!PACKAGE_MANAGERS.has(packageManager)) {
    throw new Error(`Unsupported package manager: ${packageManager}`);
  }
}

/**
 * @param {PackageManager} packageManager
 * @param {CommandAction} action
 * @param {string[]} values
 * @param {boolean} dev
 * @returns {Command}
 */
export function commandFor(packageManager, action, values = [], dev = false) {
  assertPackageManager(packageManager);

  if (action === "create") {
    /** @type {Record<PackageManager, Command>} */
    const commands = {
      npm: [
        "npx",
        [
          "--yes",
          "create-expo-app@latest",
          ...values,
          "--template",
          "blank-typescript",
          "--yes",
          "--no-install",
        ],
      ],
      pnpm: [
        "pnpm",
        [
          "dlx",
          "create-expo-app@latest",
          ...values,
          "--template",
          "blank-typescript",
          "--yes",
          "--no-install",
        ],
      ],
      yarn: [
        "yarn",
        [
          "dlx",
          "create-expo-app@latest",
          ...values,
          "--template",
          "blank-typescript",
          "--yes",
          "--no-install",
        ],
      ],
      bun: [
        "bunx",
        [
          "create-expo-app@latest",
          ...values,
          "--template",
          "blank-typescript",
          "--yes",
          "--no-install",
        ],
      ],
    };
    return commands[packageManager];
  }

  if (action === "expo-install") {
    /** @type {Record<PackageManager, Command>} */
    const expoCommands = {
      npm: ["npx", ["expo"]],
      pnpm: ["pnpm", ["exec", "expo"]],
      yarn: ["yarn", ["expo"]],
      bun: ["bunx", ["expo"]],
    };
    const expoPrefix = expoCommands[packageManager];
    const devFlag = dev ? ["--dev"] : [];
    return [expoPrefix[0], [...expoPrefix[1], "install", ...devFlag, ...values]];
  }

  if (action === "add") {
    const allowBuild =
      packageManager === "pnpm" && values.includes("convex") ? ["--allow-build=esbuild"] : [];
    /** @type {Record<PackageManager, Command>} */
    const commands = {
      npm: ["npm", ["install", ...(dev ? ["--save-dev"] : []), ...values]],
      pnpm: ["pnpm", ["add", ...(dev ? ["--save-dev"] : []), ...values, ...allowBuild]],
      yarn: ["yarn", ["add", ...(dev ? ["--dev"] : []), ...values]],
      bun: ["bun", ["add", ...(dev ? ["--dev"] : []), ...values]],
    };
    return commands[packageManager];
  }

  if (action === "tailwind-init") {
    /** @type {Record<PackageManager, Command>} */
    const commands = {
      npm: ["npx", ["tailwindcss", "init"]],
      pnpm: ["pnpm", ["exec", "tailwindcss", "init"]],
      yarn: ["yarn", ["tailwindcss", "init"]],
      bun: ["bunx", ["tailwindcss", "init"]],
    };
    return commands[packageManager];
  }

  if (action === "remove") {
    /** @type {Record<PackageManager, Command>} */
    const commands = {
      npm: ["npm", ["uninstall", ...values]],
      pnpm: ["pnpm", ["remove", ...values]],
      yarn: ["yarn", ["remove", ...values]],
      bun: ["bun", ["remove", ...values]],
    };
    return commands[packageManager];
  }

  if (action === "convex") {
    /** @type {Record<PackageManager, Command>} */
    const commands = {
      npm: ["npx", ["convex", "dev", "--once"]],
      pnpm: ["pnpm", ["exec", "convex", "dev", "--once"]],
      yarn: ["yarn", ["convex", "dev", "--once"]],
      bun: ["bunx", ["convex", "dev", "--once"]],
    };
    return commands[packageManager];
  }

  if (action === "biome") {
    const commands = {
      npm: ["npx", ["biome", "check", "--write", "."]],
      pnpm: ["pnpm", ["exec", "biome", "check", "--write", "."]],
      yarn: ["yarn", ["biome", "check", "--write", "."]],
      bun: ["bunx", ["biome", "check", "--write", "."]],
    };
    return /** @type {Record<PackageManager, Command>} */ (commands)[packageManager];
  }

  throw new Error(`Unsupported command action: ${action}`);
}

/** @param {string} targetDirectory */
export function ensureAvailableTarget(targetDirectory) {
  const projectName = path.basename(targetDirectory);
  if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
    throw new Error(
      "The project directory name may only contain letters, numbers, underscores, and hyphens.",
    );
  }
  if (!existsSync(targetDirectory)) return;
  const entries = readdirSync(targetDirectory);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDirectory}`);
  }
}

/** @param {string} projectDirectory */
export function applyTemplate(projectDirectory) {
  for (const generatedPath of [
    "App.tsx",
    "index.ts",
    "app",
    "src",
    "components",
    "constants",
    "hooks",
    "scripts",
  ]) {
    rmSync(path.join(projectDirectory, generatedPath), { recursive: true, force: true });
  }

  const sourceDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../template");
  cpSync(sourceDirectory, projectDirectory, { recursive: true, force: true });

  const biomePath = path.join(projectDirectory, "biome.json");
  const biomeConfig = JSON.parse(readFileSync(biomePath, "utf8"));
  delete biomeConfig.root;
  writeFileSync(biomePath, `${JSON.stringify(biomeConfig, null, 2)}\n`);
}

/** @param {string} projectDirectory */
export function setupNativeWind(projectDirectory) {
  const sourceDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../template");
  for (const file of [
    "babel.config.js",
    "global.css",
    "metro.config.js",
    "nativewind-env.d.ts",
    "tailwind.config.js",
    "tsconfig.json",
  ]) {
    cpSync(path.join(sourceDirectory, file), path.join(projectDirectory, file), { force: true });
  }

  const appPath = path.join(projectDirectory, "app.json");
  const appJson = JSON.parse(readFileSync(appPath, "utf8"));
  appJson.expo.web = { ...appJson.expo.web, bundler: "metro" };
  writeFileSync(appPath, `${JSON.stringify(appJson, null, 2)}\n`);
}

/** @param {string} projectDirectory */
export function patchPackageJson(projectDirectory) {
  const packagePath = path.join(projectDirectory, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

  packageJson.main = "expo-router/entry";
  packageJson.scripts = {
    ...packageJson.scripts,
    start: "expo start",
    android: "expo start --android",
    ios: "expo start --ios",
    "convex:dev": "convex dev",
    lint: "biome lint .",
    format: "biome format --write .",
    check: "biome check .",
    "check:write": "biome check --write .",
    typecheck: "tsc --noEmit",
  };
  delete packageJson.scripts.web;
  delete packageJson.scripts["reset-project"];

  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

/** @param {string} projectDirectory */
export function patchAppJson(projectDirectory) {
  const appPath = path.join(projectDirectory, "app.json");
  const appJson = JSON.parse(readFileSync(appPath, "utf8"));
  if (!appJson.expo.scheme) {
    const source = String(appJson.expo.slug ?? appJson.expo.name ?? "app").toLowerCase();
    const normalized = source.replace(/[^a-z0-9+.-]+/g, "-").replace(/^-+|-+$/g, "");
    appJson.expo.scheme = /^[a-z]/.test(normalized) ? normalized : `app-${normalized || "project"}`;
  }
  appJson.expo.platforms = ["ios", "android"];
  const plugins = Array.isArray(appJson.expo.plugins) ? appJson.expo.plugins : [];
  if (
    !plugins.some((/** @type {unknown} */ plugin) => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      return name === "expo-router";
    })
  ) {
    plugins.unshift("expo-router");
  }
  appJson.expo.plugins = plugins;
  delete appJson.expo.web;
  writeFileSync(appPath, `${JSON.stringify(appJson, null, 2)}\n`);
}
