import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizePath,
  normalizeChangedLines,
  normalizeCoverage,
} from "../../src/utils/pathNormalizer.ts";

test("normalizePath converts absolute path to project-relative", () => {
  assert.equal(
    normalizePath("/Users/apple/project/src/user.ts", "/Users/apple/project"),
    "src/user.ts",
  );
});

test("normalizePath leaves relative path unchanged", () => {
  assert.equal(normalizePath("src/user.ts", "/Users/apple/project"), "src/user.ts");
});

test("normalizePath normalizes Windows separators", () => {
  assert.equal(normalizePath("src\\user.ts", "/Users/apple/project"), "src/user.ts");
});

test("normalizePath handles trailing slash on project root", () => {
  assert.equal(
    normalizePath("/Users/apple/project/src/user.ts", "/Users/apple/project/"),
    "src/user.ts",
  );
});

test("normalizeChangedLines normalizes all keys", () => {
  const changedLines = new Map<string, Set<number>>([
    ["/Users/apple/project/src/user.ts", new Set([11, 12])],
    ["src/auth.ts", new Set([22])],
  ]);

  const normalized = normalizeChangedLines(changedLines, "/Users/apple/project");

  assert.deepEqual(
    Array.from(normalized.entries()).map(([path, lines]) => [path, Array.from(lines)]),
    [
      ["src/user.ts", [11, 12]],
      ["src/auth.ts", [22]],
    ],
  );
});

test("normalizeCoverage normalizes all keys", () => {
  const coverage = new Map<string, Map<number, boolean>>([
    ["/Users/apple/project/src/user.ts", new Map([[11, true]])],
    ["src/auth.ts", new Map([[22, false]])],
  ]);

  const normalized = normalizeCoverage(coverage, "/Users/apple/project");

  assert.deepEqual(
    Array.from(normalized.entries()).map(([path, lines]) => [path, Array.from(lines)]),
    [
      ["src/user.ts", [[11, true]]],
      ["src/auth.ts", [[22, false]]],
    ],
  );
});
