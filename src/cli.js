import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  applyTemplate,
  assertPackageManager,
  commandFor,
  detectPackageManager,
  developmentPackages,
  ensureAvailableTarget,
  patchAppJson,
  patchPackageJson,
  runtimePackages,
} from "./project.js";

const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
const { version } = JSON.parse(readFileSync(packagePath, "utf8"));

/**
 * @typedef {object} CliOptions
 * @property {string | undefined} directory
 * @property {import("./project.js").PackageManager | undefined} packageManager
 * @property {boolean} skipConvex
 * @property {boolean} help
 * @property {boolean} version
 */

function printHelp() {
  console.log(`
create-expo-convex-app ${version}

Usage:
  create-expo-convex-app [directory] [options]

Options:
  --package-manager <npm|pnpm|yarn|bun>  Override package-manager detection
  --skip-convex                            Skip the interactive Convex setup
  --help                                   Show help
  --version                                Show version
`);
}

/** @param {string[]} argv @returns {CliOptions} */
export function parseArgs(argv) {
  /** @type {CliOptions} */
  const options = {
    directory: undefined,
    packageManager: undefined,
    skipConvex: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--version" || argument === "-v") options.version = true;
    else if (argument === "--skip-convex") options.skipConvex = true;
    else if (argument === "--package-manager") {
      const packageManager = argv[index + 1];
      if (!packageManager) throw new Error("--package-manager requires a value.");
      assertPackageManager(packageManager);
      options.packageManager = packageManager;
      index += 1;
    } else if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (options.directory) {
      throw new Error("Only one project directory may be provided.");
    } else {
      options.directory = argument;
    }
  }

  return options;
}

/** @param {string} command @param {string[]} args @param {string} cwd */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? "unknown"}): ${command} ${args.join(" ")}`);
  }
}

/** @param {string | undefined} providedDirectory */
async function getDirectory(providedDirectory) {
  if (providedDirectory) return providedDirectory;
  if (!process.stdin.isTTY) {
    throw new Error("Provide a project directory when running non-interactively.");
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("What is your app named? ");
  prompt.close();
  if (!answer.trim()) throw new Error("A project directory is required.");
  return answer.trim();
}

/** @param {string[]} argv */
export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) return printHelp();
  if (options.version) return console.log(version);

  const directory = await getDirectory(options.directory);
  const projectDirectory = path.resolve(process.cwd(), directory);
  const packageManager = options.packageManager ?? detectPackageManager();
  ensureAvailableTarget(projectDirectory);

  console.log(`\nCreating ${path.basename(projectDirectory)} with Expo and ${packageManager}...\n`);
  const [createCommand, createArgs] = commandFor(packageManager, "create", [projectDirectory]);
  run(createCommand, createArgs, process.cwd());

  console.log("\nInstalling the app dependencies...\n");
  const [installCommand, installArgs] = commandFor(packageManager, "expo-install", runtimePackages);
  run(installCommand, installArgs, projectDirectory);

  const [devCommand, devArgs] = commandFor(packageManager, "expo-install-dev", developmentPackages);
  run(devCommand, devArgs, projectDirectory);

  const packageJson = JSON.parse(readFileSync(path.join(projectDirectory, "package.json"), "utf8"));
  const generatedPackagesToRemove = [
    "expo-device",
    "expo-font",
    "expo-glass-effect",
    "expo-image",
    "expo-splash-screen",
    "expo-status-bar",
    "expo-symbols",
    "expo-system-ui",
    "expo-web-browser",
    "react-dom",
    "react-native-web",
  ];
  const removablePackages = generatedPackagesToRemove.filter(
    (name) => packageJson.dependencies?.[name] || packageJson.devDependencies?.[name],
  );
  if (removablePackages.length > 0) {
    const [removeCommand, removeArgs] = commandFor(packageManager, "remove", removablePackages);
    run(removeCommand, removeArgs, projectDirectory);
  }

  console.log("\nApplying the native-first starter...\n");
  applyTemplate(projectDirectory);
  patchPackageJson(projectDirectory);
  patchAppJson(projectDirectory);
  const [biomeCommand, biomeArgs] = commandFor(packageManager, "biome");
  run(biomeCommand, biomeArgs, projectDirectory);

  if (!options.skipConvex) {
    console.log("\nConnect this app to a Convex project when prompted.\n");
    const [convexCommand, convexArgs] = commandFor(packageManager, "convex");
    run(convexCommand, convexArgs, projectDirectory);
  }

  const relativeDirectory = path.relative(process.cwd(), projectDirectory) || ".";
  const startCommand = packageManager === "npm" ? "npm run start" : `${packageManager} start`;
  console.log(`
Done. Your Expo + Convex app is ready.

Next steps:
  cd ${relativeDirectory}
  ${options.skipConvex ? `${packageManager === "npm" ? "npx" : packageManager === "pnpm" ? "pnpm exec" : packageManager === "bun" ? "bunx" : "yarn"} convex dev --once\n  ` : ""}${startCommand}

Useful checks:
  ${packageManager === "npm" ? "npm run" : packageManager} check
  ${packageManager === "npm" ? "npm run" : packageManager} typecheck
`);
}
