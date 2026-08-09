import test from "node:test";
import assert from "node:assert/strict";
import type { CoverageAnalysis } from "../../src/analyzer/analyzer.ts";
import { main, runCli, type CliDeps } from "../../src/cli.ts";
import type { LineCoverage } from "../../src/coverage/parser.ts";

function makeAnalysis(overrides: Partial<CoverageAnalysis> = {}): CoverageAnalysis {
  return {
    changedFiles: 1,
    changedLines: 2,
    coveredLines: 2,
    coveragePercent: 100,
    branchesTotal: 0,
    branchesCovered: 0,
    branchPercent: 100,
    functionsTotal: 0,
    functionsCovered: 0,
    functionPercent: 100,
    uncovered: [],
    files: [],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<CliDeps> = {}): CliDeps {
  const changedLines = new Map<string, Set<number>>([["src/user.ts", new Set([1])]]);
  const coverage = new Map<string, Map<number, LineCoverage>>();

  return {
    readFileSync: () => JSON.stringify({ scripts: {} }),
    execFile: async () => undefined,
    getRawDiff: () => "diff text",
    getRepoRoot: () => "/repo",
    parseChangedLines: () => changedLines,
    readCoverageFile: () => coverage,
    normalizeChangedLines: (lines) => lines,
    normalizeCoverage: (lineCoverage) => lineCoverage,
    analyzeCoverage: () => makeAnalysis(),
    printReport: () => undefined,
    startSpinner: () => ({
      stop: () => undefined,
    }),
    log: () => undefined,
    error: () => undefined,
    ...overrides,
  };
}

test("runCli runs npm coverage when package.json has a coverage script", async () => {
  let coverageCommand: [string, string[]] | null = null;
  const deps = makeDeps({
    readFileSync: () => JSON.stringify({ scripts: { coverage: "vitest run --coverage" } }),
    execFile: async (command, args) => {
      coverageCommand = [command, args];
    },
  });

  const exitCode = await runCli([], deps);

  assert.equal(exitCode, 0);
  assert.deepEqual(coverageCommand, ["npm", ["run", "coverage"]]);
});

test("runCli emits debug logs when --debug is set", async () => {
  const logs: string[] = [];
  const deps = makeDeps({
    readFileSync: () => JSON.stringify({ scripts: { coverage: "vitest run --coverage" } }),
    log: (message) => {
      logs.push(message);
    },
  });

  const exitCode = await runCli(["--debug"], deps);

  assert.equal(exitCode, 0);
  assert.ok(logs.some((message) => message.includes("[debug] cli started with args: [\"--debug\"]")));
  assert.ok(logs.some((message) => message.includes("[debug] coverage step started")));
  assert.ok(logs.some((message) => message.includes("[debug] analysis step started")));
  assert.ok(logs.some((message) => message.includes("[debug] cli completed successfully")));
});

test("runCli returns failure when coverage file reading fails", async () => {
  let errorMessage = "";
  const deps = makeDeps({
    readCoverageFile: () => {
      throw new Error("coverage-final.json missing");
    },
    error: (message) => {
      errorMessage = message;
    },
  });

  const exitCode = await runCli([], deps);

  assert.equal(exitCode, 1);
  assert.equal(errorMessage, "coverage-final.json missing");
});

test("runCli emits debug logs when analysis fails", async () => {
  const logs: string[] = [];
  const deps = makeDeps({
    readFileSync: () => JSON.stringify({ scripts: { coverage: "vitest run --coverage" } }),
    readCoverageFile: () => {
      throw new Error("coverage-final.json missing");
    },
    log: (message) => {
      logs.push(message);
    },
  });

  const exitCode = await runCli(["--debug"], deps);

  assert.equal(exitCode, 1);
  assert.ok(logs.some((message) => message.includes("[debug] analysis step failed")));
});

test("runCli returns failure when line coverage is below threshold", async () => {
  const deps = makeDeps({
    analyzeCoverage: () => makeAnalysis({ coveragePercent: 79 }),
  });

  assert.equal(await runCli(["--min", "80"], deps), 1);
});

test("runCli returns failure when branch coverage is below threshold", async () => {
  const deps = makeDeps({
    analyzeCoverage: () =>
      makeAnalysis({
        branchesTotal: 4,
        branchesCovered: 3,
        branchPercent: 75,
      }),
  });

  assert.equal(await runCli(["--min-branches", "80"], deps), 1);
});

test("runCli returns failure when function coverage is below threshold", async () => {
  const deps = makeDeps({
    analyzeCoverage: () =>
      makeAnalysis({
        functionsTotal: 4,
        functionsCovered: 3,
        functionPercent: 75,
      }),
  });

  assert.equal(await runCli(["--min-functions", "80"], deps), 1);
});

test("runCli returns success when all thresholds pass", async () => {
  const deps = makeDeps({
    analyzeCoverage: () =>
      makeAnalysis({
        coveragePercent: 90,
        branchesTotal: 4,
        branchesCovered: 4,
        branchPercent: 100,
        functionsTotal: 4,
        functionsCovered: 4,
        functionPercent: 100,
      }),
  });

  assert.equal(await runCli(["--min", "80", "--min-branches", "80", "--min-functions", "80"], deps), 0);
});

test("main exits with the code returned by runCli", async () => {
  let exitCode: number | undefined;
  const deps = makeDeps({
    analyzeCoverage: () => makeAnalysis({ coveragePercent: 50 }),
  });

  await main(["--min", "80"], deps, (code) => {
    exitCode = code;
  });

  assert.equal(exitCode, 1);
});
