import test from "node:test";
import assert from "node:assert/strict";

import { analyzeCoverage } from "../../src/analyzer/analyzer.ts";

test("analyzeCoverage calculates per-file and aggregate stats", () => {
  const changedLines = new Map<string, Set<number>>([
    ["src/user.ts", new Set([11, 12, 13])],
    ["src/auth.ts", new Set([22, 23])],
  ]);

  const coverage = new Map<string, Map<number, boolean>>([
    ["src/user.ts", new Map([[11, true], [12, true], [13, false]])],
    ["src/auth.ts", new Map([[22, true], [23, false]])],
  ]);

  const analysis = analyzeCoverage(changedLines, coverage);

  assert.equal(analysis.changedFiles, 2);
  assert.equal(analysis.changedLines, 5);
  assert.equal(analysis.coveredLines, 3);
  assert.equal(analysis.coveragePercent, 60);
  assert.deepEqual(analysis.uncovered, [
    { file: "src/auth.ts", line: 23 },
    { file: "src/user.ts", line: 13 },
  ]);
  assert.deepEqual(analysis.files, [
    { file: "src/user.ts", changed: 3, covered: 2, uncovered: [13] },
    { file: "src/auth.ts", changed: 2, covered: 1, uncovered: [23] },
  ]);
});

test("analyzeCoverage treats missing file coverage as fully uncovered", () => {
  const changedLines = new Map<string, Set<number>>([
    ["src/missing.ts", new Set([1, 2])],
  ]);

  const coverage = new Map<string, Map<number, boolean>>();

  const analysis = analyzeCoverage(changedLines, coverage);

  assert.equal(analysis.changedFiles, 1);
  assert.equal(analysis.changedLines, 2);
  assert.equal(analysis.coveredLines, 0);
  assert.equal(analysis.coveragePercent, 0);
  assert.deepEqual(analysis.uncovered, [
    { file: "src/missing.ts", line: 1 },
    { file: "src/missing.ts", line: 2 },
  ]);
  assert.deepEqual(analysis.files, [
    { file: "src/missing.ts", changed: 2, covered: 0, uncovered: [1, 2] },
  ]);
});

test("analyzeCoverage returns zero percent when no changed lines", () => {
  const changedLines = new Map<string, Set<number>>();
  const coverage = new Map<string, Map<number, boolean>>();

  const analysis = analyzeCoverage(changedLines, coverage);

  assert.equal(analysis.changedFiles, 0);
  assert.equal(analysis.changedLines, 0);
  assert.equal(analysis.coveredLines, 0);
  assert.equal(analysis.coveragePercent, 0);
  assert.deepEqual(analysis.uncovered, []);
  assert.deepEqual(analysis.files, []);
});
