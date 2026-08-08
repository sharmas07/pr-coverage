import test from "node:test";
import assert from "node:assert/strict";

import { formatReport } from "../../src/reporter/reporter.ts";
import type { CoverageAnalysis } from "../../src/analyzer/analyzer.ts";

function makeAnalysis(overrides: Partial<CoverageAnalysis> = {}): CoverageAnalysis {
  return {
    changedFiles: 2,
    changedLines: 5,
    coveredLines: 3,
    coveragePercent: 60,
    uncovered: [
      { file: "src/auth.ts", line: 23 },
      { file: "src/user.ts", line: 13 },
    ],
    files: [
      { file: "src/user.ts", changed: 3, covered: 2, uncovered: [13] },
      { file: "src/auth.ts", changed: 2, covered: 1, uncovered: [23] },
    ],
    ...overrides,
  };
}

test("formatReport renders summary and uncovered lines", () => {
  const analysis = makeAnalysis();

  const expected = [
    "Changed files: 2",
    "Changed lines: 5",
    "Covered lines: 3",
    "",
    "PR Coverage: 60%",
    "",
    "Uncovered:",
    "src/auth.ts:23",
    "src/user.ts:13",
  ].join("\n");

  assert.equal(formatReport(analysis), expected);
});

test("formatReport omits uncovered section when none exist", () => {
  const analysis = makeAnalysis({
    uncovered: [],
    coveredLines: 5,
    coveragePercent: 100,
  });

  const expected = [
    "Changed files: 2",
    "Changed lines: 5",
    "Covered lines: 5",
    "",
    "PR Coverage: 100%",
  ].join("\n");

  assert.equal(formatReport(analysis), expected);
});

test("formatReport handles zero changed lines", () => {
  const analysis = makeAnalysis({
    changedFiles: 0,
    changedLines: 0,
    coveredLines: 0,
    coveragePercent: 0,
    uncovered: [],
    files: [],
  });

  const expected = [
    "Changed files: 0",
    "Changed lines: 0",
    "Covered lines: 0",
    "",
    "PR Coverage: 0%",
  ].join("\n");

  assert.equal(formatReport(analysis), expected);
});
