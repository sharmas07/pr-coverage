import test from "node:test";
import assert from "node:assert/strict";

import { analyzeCoverage } from "../../src/analyzer/analyzer.ts";
import type { LineCoverage } from "../../src/coverage/parser.ts";

function lineCoverage(isStatementCovered: boolean): LineCoverage {
  return {
    isStatementCovered,
    branches: [],
    isFunctionCovered: null,
  };
}

test("analyzeCoverage calculates per-file and aggregate stats", () => {
  const changedLines = new Map<string, Set<number>>([
    ["src/user.ts", new Set([11, 12, 13])],
    ["src/auth.ts", new Set([22, 23])],
  ]);

  const coverage = new Map<string, Map<number, LineCoverage>>([
    ["src/user.ts", new Map([[11, lineCoverage(true)], [12, lineCoverage(true)], [13, lineCoverage(false)]])],
    ["src/auth.ts", new Map([[22, lineCoverage(true)], [23, lineCoverage(false)]])],
  ]);

  const analysis = analyzeCoverage(changedLines, coverage);

  assert.equal(analysis.changedFiles, 2);
  assert.equal(analysis.changedLines, 5);
  assert.equal(analysis.coveredLines, 3);
  assert.equal(analysis.coveragePercent, 60);
  assert.deepEqual(analysis.uncovered, [
    { file: "src/auth.ts", line: 23, reason: "statement" },
    { file: "src/user.ts", line: 13, reason: "statement" },
  ]);
  assert.deepEqual(analysis.files, [
    {
      file: "src/user.ts",
      changed: 3,
      covered: 2,
      uncovered: [13],
      branchesTotal: 0,
      branchesCovered: 0,
      functionsTotal: 0,
      functionsCovered: 0,
    },
    {
      file: "src/auth.ts",
      changed: 2,
      covered: 1,
      uncovered: [23],
      branchesTotal: 0,
      branchesCovered: 0,
      functionsTotal: 0,
      functionsCovered: 0,
    },
  ]);
});

test("analyzeCoverage treats missing file coverage as fully uncovered", () => {
  const changedLines = new Map<string, Set<number>>([
    ["src/missing.ts", new Set([1, 2])],
  ]);

  const coverage = new Map<string, Map<number, LineCoverage>>();

  const analysis = analyzeCoverage(changedLines, coverage);

  assert.equal(analysis.changedFiles, 1);
  assert.equal(analysis.changedLines, 2);
  assert.equal(analysis.coveredLines, 0);
  assert.equal(analysis.coveragePercent, 0);
  assert.deepEqual(analysis.uncovered, [
    { file: "src/missing.ts", line: 1, reason: "untracked" },
    { file: "src/missing.ts", line: 2, reason: "untracked" },
  ]);
  assert.deepEqual(analysis.files, [
    {
      file: "src/missing.ts",
      changed: 2,
      covered: 0,
      uncovered: [1, 2],
      branchesTotal: 0,
      branchesCovered: 0,
      functionsTotal: 0,
      functionsCovered: 0,
    },
  ]);
});

test("analyzeCoverage returns zero percent when no changed lines", () => {
  const changedLines = new Map<string, Set<number>>();
  const coverage = new Map<string, Map<number, LineCoverage>>();

  const analysis = analyzeCoverage(changedLines, coverage);

  assert.equal(analysis.changedFiles, 0);
  assert.equal(analysis.changedLines, 0);
  assert.equal(analysis.coveredLines, 0);
  assert.equal(analysis.coveragePercent, 0);
  assert.deepEqual(analysis.uncovered, []);
  assert.deepEqual(analysis.files, []);
});
