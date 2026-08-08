import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseCoverageJson, readCoverageFile, type LineCoverage } from "../../src/coverage/parser.ts";

function toObject(map: Map<string, Map<number, LineCoverage>>): Record<string, Record<string, LineCoverage>> {
  return Object.fromEntries(
    Array.from(map.entries(), ([filePath, lineMap]) => [
      filePath,
      Object.fromEntries(lineMap.entries()),
    ]),
  );
}

test("parseCoverageJson uses l field when present", () => {
  const coverageJson = {
    "/project/src/user.ts": {
      path: "/project/src/user.ts",
      l: { "11": 1, "12": 0, "13": 5 },
    },
  };

  assert.deepEqual(toObject(parseCoverageJson(coverageJson)), {
    "/project/src/user.ts": {
      "11": { isStatementCovered: true, branches: [], isFunctionCovered: null },
      "12": { isStatementCovered: false, branches: [], isFunctionCovered: null },
      "13": { isStatementCovered: true, branches: [], isFunctionCovered: null },
    },
  });
});

test("parseCoverageJson falls back to statementMap and s when l is missing", () => {
  const coverageJson = {
    "/project/src/auth.ts": {
      path: "/project/src/auth.ts",
      statementMap: {
        "0": { start: { line: 5 }, end: { line: 5 } },
        "1": { start: { line: 6 }, end: { line: 6 } },
        "2": { start: { line: 6 }, end: { line: 6 } },
      },
      s: { "0": 1, "1": 0, "2": 1 },
    },
  };

  assert.deepEqual(toObject(parseCoverageJson(coverageJson)), {
    "/project/src/auth.ts": {
      "5": { isStatementCovered: true, branches: [], isFunctionCovered: null },
      "6": { isStatementCovered: true, branches: [], isFunctionCovered: null },
    },
  });
});

test("parseCoverageJson ignores files with no line or statement coverage", () => {
  const coverageJson = {
    "/project/src/empty.ts": {
      path: "/project/src/empty.ts",
    },
  };

  assert.deepEqual(toObject(parseCoverageJson(coverageJson)), {});
});

test("readCoverageFile reads coverage from disk", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coverage-"));
  const coveragePath = join(tempDir, "coverage-final.json");

  const coverageJson = {
    "/project/src/api.ts": {
      path: "/project/src/api.ts",
      l: { "1": 1, "2": 0 },
    },
  };

  writeFileSync(coveragePath, JSON.stringify(coverageJson), "utf-8");

  try {
    assert.deepEqual(toObject(readCoverageFile(coveragePath)), {
      "/project/src/api.ts": {
        "1": { isStatementCovered: true, branches: [], isFunctionCovered: null },
        "2": { isStatementCovered: false, branches: [], isFunctionCovered: null },
      },
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
