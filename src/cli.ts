#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { getRawDiff, getRepoRoot } from "./git/diff.js";
import { parseChangedLines } from "./git/parser.js";
import { readCoverageFile } from "./coverage/parser.js";
import { normalizeChangedLines, normalizeCoverage } from "./utils/pathNormalizer.js";
import { analyzeCoverage } from "./analyzer/analyzer.js";
import { printReport } from "./reporter/reporter.js";
import { parseArgs } from "./cli/args.js";

const execFileAsync = promisify(execFile);

const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function startSpinner(message: string): NodeJS.Timeout {
  let index = 0;

  const interval = setInterval(() => {
    process.stdout.write(
      `\r${COLORS.cyan}${FRAMES[index]} ${message}${COLORS.reset}`,
    );
    index = (index + 1) % FRAMES.length;
  }, 80);

  return interval;
}

function stopSpinner(
  interval: NodeJS.Timeout,
  message: string,
  status: "success" | "error" = "success",
): void {
  clearInterval(interval);
  const symbol = status === "success" ? "✔" : "✖";
  const color = status === "success" ? COLORS.green : COLORS.red;
  process.stdout.write(`\r${color}${symbol} ${message}${COLORS.reset}\n`);
}

function hasCoverageScript(): boolean {
  try {
    const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    return typeof packageJson.scripts?.coverage === "string";
  } catch {
    return false;
  }
}

async function runCoverage(): Promise<void> {
  const spinner = startSpinner("Running coverage...");

  try {
    await execFileAsync("npm", ["run", "coverage"]);
    stopSpinner(spinner, "Coverage complete", "success");
  } catch (error) {
    stopSpinner(spinner, "Coverage failed", "error");

    if (error instanceof Error && "stderr" in error) {
      const stderr = (error as { stderr: string }).stderr;

      if (stderr) {
        console.error(`${COLORS.red}${stderr}${COLORS.reset}`);
      }
    }

    throw error;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (hasCoverageScript()) {
    await runCoverage();
  } else {
    console.log(
      `${COLORS.yellow}ℹ No coverage script found; using existing coverage/coverage-final.json${COLORS.reset}`,
    );
  }

  const spinner = startSpinner("Analyzing PR coverage...");

  try {
    const diffText = getRawDiff(options.base);
    const changedLines = parseChangedLines(diffText);
    const coverage = readCoverageFile(options.coverage);

    const projectRoot = getRepoRoot();
    const normalizedChangedLines = normalizeChangedLines(changedLines, projectRoot);
    const normalizedCoverage = normalizeCoverage(coverage, projectRoot);

    const analysis = analyzeCoverage(normalizedChangedLines, normalizedCoverage);
    stopSpinner(spinner, "Analysis complete", "success");

    printReport(analysis);

    if (analysis.coveragePercent < options.min) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    stopSpinner(spinner, "Analysis failed", "error");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

main().catch(() => process.exit(1));
