import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  applyTemplate,
  assertPackageManager,
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
} from "./project.js";

const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
const { version } = JSON.parse(readFileSync(packagePath, "utf8"));
const CLI_NAME = "create-ard-app";
const colors = {
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  reset: "\u001b[0m",
};

const banner = String.raw`
   ___ _ __ ___  __ _| |_ ___        __ _ _ __ __| |       __ _ _ __  _ __
  / __| '__/ _ \/ _${"`"} | __/ _ \_____ / _${"`"} | '__/ _${"`"} |_____ / _${"`"} | '_ \| '_ \
 | (__| | |  __/ (_| | ||  __/_____| (_| | | | (_| |_____| (_| | |_) | |_) |
  \___|_|  \___|\__,_|\__\___|      \__,_|_|  \__,_|      \__,_| .__/| .__/
                                                                |_|   |_|
`;

/** @param {string} value @param {keyof typeof colors} tone */
function colorize(value, tone) {
  if (!process.stdout.isTTY || process.env.NO_COLOR !== undefined) return value;
  return `${colors[tone]}${value}${colors.reset}`;
}

export function printBanner() {
  process.stdout.write(`${colorize(banner, "cyan")}\n`);
}

/** @param {string} message @param {"cyan" | "green" | "red"} tone */
export function printBox(message, tone = "cyan") {
  const content = `[${CLI_NAME}] ${message}`;
  const border = "─".repeat(content.length + 2);
  const box = `┌${border}┐\n│ ${content} │\n└${border}┘`;
  const output = `${colorize(box, tone)}\n`;
  if (tone === "red") process.stderr.write(`\n${output}`);
  else process.stdout.write(`\n${output}`);
}

/** @param {unknown} error */
export function printError(error) {
  const message = error instanceof Error ? error.message : String(error);
  printBox(`Error: ${message}`, "red");
}

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
create-ard-app ${version}

Usage:
  create-ard-app [directory] [options]

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

/** @param {string} projectDirectory */
function commitGeneratedProject(projectDirectory) {
  if (!existsSync(path.join(projectDirectory, ".git"))) return;

  printBox("Committing the completed starter...");
  run("git", ["add", "--all"], projectDirectory);
  run("git", ["commit", "-m", "Set up Expo and Convex app"], projectDirectory);
}

/** @param {string | undefined} providedDirectory */
async function getDirectory(providedDirectory) {
  if (providedDirectory) return providedDirectory;
  if (!process.stdin.isTTY) {
    throw new Error("Provide a project directory when running non-interactively.");
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question(`[${CLI_NAME}] What is your app named? `);
  prompt.close();
  if (!answer.trim()) throw new Error("A project directory is required.");
  return answer.trim();
}

/** @param {string[]} argv */
export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) return printHelp();
  if (options.version) return console.log(version);
  printBanner();

  const directory = await getDirectory(options.directory);
  const projectDirectory = path.resolve(process.cwd(), directory);
  const packageManager = options.packageManager ?? detectPackageManager();
  ensureAvailableTarget(projectDirectory);

  printBox(`Creating ${path.basename(projectDirectory)} with Expo and ${packageManager}...`);
  const [createCommand, createArgs] = commandFor(packageManager, "create", [projectDirectory]);
  run(createCommand, createArgs, process.cwd());

  if (packageManager === "pnpm") {
    run("pnpm", ["config", "set", "--location=project", "nodeLinker", "hoisted"], projectDirectory);
  }

  printBox("Setting up NativeWind...");
  const [nativeWindCommand, nativeWindArgs] = commandFor(packageManager, "add", nativeWindPackages);
  run(nativeWindCommand, nativeWindArgs, projectDirectory);

  const [nativeWindDevCommand, nativeWindDevArgs] = commandFor(
    packageManager,
    "add",
    nativeWindDevelopmentPackages,
    true,
  );
  run(nativeWindDevCommand, nativeWindDevArgs, projectDirectory);

  const [tailwindCommand, tailwindArgs] = commandFor(packageManager, "tailwind-init");
  run(tailwindCommand, tailwindArgs, projectDirectory);
  setupNativeWind(projectDirectory);

  printBox("Installing the Expo app dependencies...");
  const [expoInstallCommand, expoInstallArgs] = commandFor(
    packageManager,
    "expo-install",
    expoPackages,
  );
  run(expoInstallCommand, expoInstallArgs, projectDirectory);

  printBox("Installing the development tools...");
  const [devCommand, devArgs] = commandFor(packageManager, "add", developmentPackages, true);
  run(devCommand, devArgs, projectDirectory);

  printBox("Installing Convex...");
  const [convexInstallCommand, convexInstallArgs] = commandFor(
    packageManager,
    "add",
    convexPackages,
  );
  run(convexInstallCommand, convexInstallArgs, projectDirectory);

  if (!options.skipConvex) {
    printBox("Connect this app to a Convex project when prompted.");
    const [convexCommand, convexArgs] = commandFor(packageManager, "convex");
    run(convexCommand, convexArgs, projectDirectory);
  }

  const packageJson = JSON.parse(readFileSync(path.join(projectDirectory, "package.json"), "utf8"));
  const removablePackages = generatedPackagesToRemove.filter(
    (name) => packageJson.dependencies?.[name] || packageJson.devDependencies?.[name],
  );
  if (removablePackages.length > 0) {
    const [removeCommand, removeArgs] = commandFor(packageManager, "remove", removablePackages);
    run(removeCommand, removeArgs, projectDirectory);
  }

  printBox("Applying the native-first starter...");
  applyTemplate(projectDirectory);
  patchPackageJson(projectDirectory);
  patchAppJson(projectDirectory);
  const [biomeCommand, biomeArgs] = commandFor(packageManager, "biome");
  run(biomeCommand, biomeArgs, projectDirectory);

  if (!options.skipConvex) {
    printBox("Syncing the starter functions with Convex...");
    const [convexCommand, convexArgs] = commandFor(packageManager, "convex");
    run(convexCommand, convexArgs, projectDirectory);
  }

  commitGeneratedProject(projectDirectory);

  const relativeDirectory = path.relative(process.cwd(), projectDirectory) || ".";
  const startCommand = packageManager === "npm" ? "npm run start" : `${packageManager} start`;
  printBox("Done. Your Expo + Convex app is ready.", "green");
  console.log(`Next steps:
  cd ${relativeDirectory}
  ${options.skipConvex ? `${packageManager === "npm" ? "npx" : packageManager === "pnpm" ? "pnpm exec" : packageManager === "bun" ? "bunx" : "yarn"} convex dev --once\n  ` : ""}${startCommand}

Useful checks:
  ${packageManager === "npm" ? "npm run" : packageManager} check
  ${packageManager === "npm" ? "npm run" : packageManager} typecheck
`);
}
