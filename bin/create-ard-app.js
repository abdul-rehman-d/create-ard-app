#!/usr/bin/env node

import { main, printError } from "../src/cli.js";

main().catch((error) => {
  printError(error);
  process.exitCode = 1;
});
