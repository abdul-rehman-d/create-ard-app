import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);

/** @typedef {"npm" | "pnpm" | "yarn" | "bun"} PackageManager */
/** @typedef {"create" | "expo-install" | "expo-install-dev" | "remove" | "convex" | "biome"} CommandAction */
/** @typedef {[string, string[]]} Command */

export const runtimePackages = [
  "convex",
  "@react-native-async-storage/async-storage",
  "@react-native-community/netinfo",
  "react-native-safe-area-context",
  "@expo/ui",
  "@tanstack/react-form",
  "nativewind@4.2.7",
  "react-native-reanimated",
  "react-native-worklets",
];

export const developmentPackages = ["@biomejs/biome@2.5.14", "tailwindcss@^3.4.17"];

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
 * @returns {Command}
 */
export function commandFor(packageManager, action, values = []) {
  assertPackageManager(packageManager);

  if (action === "create") {
    /** @type {Record<PackageManager, Command>} */
    const commands = {
      npm: ["npx", ["--yes", "create-expo-app@latest", ...values, "--yes"]],
      pnpm: ["pnpm", ["dlx", "create-expo-app@latest", ...values, "--yes"]],
      yarn: ["yarn", ["dlx", "create-expo-app@latest", ...values, "--yes"]],
      bun: ["bunx", ["create-expo-app@latest", ...values, "--yes"]],
    };
    return commands[packageManager];
  }

  if (action === "expo-install" || action === "expo-install-dev") {
    /** @type {Record<PackageManager, Command>} */
    const expoCommands = {
      npm: ["npx", ["expo"]],
      pnpm: ["pnpm", ["exec", "expo"]],
      yarn: ["yarn", ["expo"]],
      bun: ["bunx", ["expo"]],
    };
    const expoPrefix = expoCommands[packageManager];
    const devFlag = action === "expo-install-dev" ? ["--dev"] : [];
    return [expoPrefix[0], [...expoPrefix[1], "install", ...devFlag, ...values]];
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
  for (const generatedPath of ["app", "src", "components", "constants", "hooks", "scripts"]) {
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
export function patchPackageJson(projectDirectory) {
  const packagePath = path.join(projectDirectory, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

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
  appJson.expo.platforms = ["ios", "android"];
  if (Array.isArray(appJson.expo.plugins)) {
    appJson.expo.plugins = appJson.expo.plugins.filter((/** @type {unknown} */ plugin) => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      return name !== "expo-splash-screen";
    });
  }
  delete appJson.expo.web;
  writeFileSync(appPath, `${JSON.stringify(appJson, null, 2)}\n`);
}
