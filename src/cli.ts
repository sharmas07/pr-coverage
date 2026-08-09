#!/usr/bin/env node
import { execFile, type ExecFileException } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
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

interface Spinner {
  stop(message: string, status?: "success" | "error"): void;
}

export interface CliDeps {
  readFileSync: typeof readFileSync;
  execFile: (command: string, args: string[]) => Promise<void>;
  getRawDiff: typeof getRawDiff;
  getRepoRoot: typeof getRepoRoot;
  parseChangedLines: typeof parseChangedLines;
  readCoverageFile: typeof readCoverageFile;
  normalizeChangedLines: typeof normalizeChangedLines;
  normalizeCoverage: typeof normalizeCoverage;
  analyzeCoverage: typeof analyzeCoverage;
  printReport: typeof printReport;
  startSpinner: (message: string) => Spinner;
  log: (message: string) => void;
  error: (message: string) => void;
}

export const defaultDeps: CliDeps = {
  readFileSync,
  execFile: async (command, args) => {
    await execFileAsync(command, args);
  },
  getRawDiff,
  getRepoRoot,
  parseChangedLines,
  readCoverageFile,
  normalizeChangedLines,
  normalizeCoverage,
  analyzeCoverage,
  printReport,
  startSpinner,
  log: console.log,
  error: console.error,
};

function startSpinner(message: string): Spinner {
  let index = 0;

  const interval = setInterval(() => {
    process.stdout.write(
      `\r${COLORS.cyan}${FRAMES[index]} ${message}${COLORS.reset}`,
    );
    index = (index + 1) % FRAMES.length;
  }, 80);

  return {
    stop(stopMessage, status = "success") {
      stopSpinner(interval, stopMessage, status);
    },
  };
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

function hasCoverageScript(deps: CliDeps): boolean {
  try {
    const packageJson = JSON.parse(deps.readFileSync("package.json", "utf-8").toString());
    return typeof packageJson.scripts?.coverage === "string";
  } catch {
    return false;
  }
}

function debugLog(deps: CliDeps, enabled: boolean, message: string): void {
  if (enabled) {
    deps.log(`${COLORS.cyan}[debug] ${message}${COLORS.reset}`);
  }
}

async function runCoverage(deps: CliDeps, debugEnabled: boolean): Promise<void> {
  debugLog(deps, debugEnabled, "coverage step started");
  const spinner = deps.startSpinner("Running coverage...");

  try {
    await deps.execFile("npm", ["run", "coverage"]);
    spinner.stop("Coverage complete", "success");
    debugLog(deps, debugEnabled, "coverage step completed");
  } catch (error) {
    spinner.stop("Coverage failed", "error");
    debugLog(deps, debugEnabled, "coverage step failed");

    if (error instanceof Error && "stderr" in error) {
      const stderr = (error as ExecFileException & { stderr?: string }).stderr;

      if (stderr) {
        deps.error(`${COLORS.red}${stderr}${COLORS.reset}`);
      }
    }

    throw error;
  }
}

export async function runCli(args: string[], deps: CliDeps = defaultDeps): Promise<number> {
  const options = parseArgs(args);
  debugLog(deps, options.debug, `cli started with args: ${JSON.stringify(args)}`);
  debugLog(
    deps,
    options.debug,
    `parsed options: ${JSON.stringify({
      base: options.base,
      coverage: options.coverage,
      min: options.min,
      minBranches: options.minBranches,
      minFunctions: options.minFunctions,
      debug: options.debug,
    })}`,
  );

  debugLog(deps, options.debug, "checking for coverage script in package.json");
  if (hasCoverageScript(deps)) {
    debugLog(deps, options.debug, "coverage script found");
    await runCoverage(deps, options.debug);
  } else {
    debugLog(deps, options.debug, "coverage script not found");
    deps.log(
      `${COLORS.yellow}ℹ No coverage script found; using existing coverage/coverage-final.json${COLORS.reset}`,
    );
  }

  debugLog(deps, options.debug, "analysis step started");
  const spinner = deps.startSpinner("Analyzing PR coverage...");

  try {
    debugLog(deps, options.debug, `reading diff for base branch: ${options.base}`);
    const diffText = deps.getRawDiff(options.base);
    debugLog(deps, options.debug, "parsing changed lines from diff");
    const changedLines = deps.parseChangedLines(diffText);
    debugLog(deps, options.debug, `reading coverage file: ${options.coverage}`);
    const coverage = deps.readCoverageFile(options.coverage);

    debugLog(deps, options.debug, "resolving repository root");
    const projectRoot = deps.getRepoRoot();
    debugLog(deps, options.debug, "normalizing changed lines");
    const normalizedChangedLines = deps.normalizeChangedLines(changedLines, projectRoot);
    debugLog(deps, options.debug, "normalizing coverage data");
    const normalizedCoverage = deps.normalizeCoverage(coverage, projectRoot);

    debugLog(deps, options.debug, "running coverage analysis");
    const analysis = deps.analyzeCoverage(normalizedChangedLines, normalizedCoverage);
    spinner.stop("Analysis complete", "success");
    debugLog(deps, options.debug, "analysis step completed");

    debugLog(deps, options.debug, "printing report");
    deps.printReport(analysis);

    if (analysis.coveragePercent < options.min) {
      debugLog(deps, options.debug, `line coverage below threshold: ${analysis.coveragePercent} < ${options.min}`);
      return 1;
    }

    const minBranches = options.minBranches ?? options.min;
    if (analysis.branchesTotal > 0 && analysis.branchPercent < minBranches) {
      debugLog(deps, options.debug, `branch coverage below threshold: ${analysis.branchPercent} < ${minBranches}`);
      return 1;
    }

    const minFunctions = options.minFunctions ?? options.min;
    if (analysis.functionsTotal > 0 && analysis.functionPercent < minFunctions) {
      debugLog(deps, options.debug, `function coverage below threshold: ${analysis.functionPercent} < ${minFunctions}`);
      return 1;
    }

    debugLog(
      deps,
      options.debug,
      `thresholds passed: line=${analysis.coveragePercent} branch=${analysis.branchPercent} function=${analysis.functionPercent}`,
    );
    debugLog(deps, options.debug, "cli completed successfully");
    return 0;
  } catch (error) {
    spinner.stop("Analysis failed", "error");
    debugLog(deps, options.debug, "analysis step failed");
    deps.error(error instanceof Error ? error.message : "Unknown error");
    return 1;
  }
}

export async function main(
  args: string[] = process.argv.slice(2),
  deps: CliDeps = defaultDeps,
  exit: (code?: number) => void = process.exit,
): Promise<void> {
  const exitCode = await runCli(args, deps);
  exit(exitCode);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(() => process.exit(1));
}
