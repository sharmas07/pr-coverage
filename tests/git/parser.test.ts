import test from "node:test";
import assert from "node:assert/strict";

import { parseChangedLines, parseFiles } from "../../src/git/parser.ts";

function toObject(map: Map<string, Set<number>>): Record<string, number[]> {
  return Object.fromEntries(
    Array.from(map.entries(), ([filePath, lines]) => [
      filePath,
      Array.from(lines).sort((left, right) => left - right),
    ]),
  );
}

test("parseFiles extracts changed file paths from diff headers", () => {
  const diffText = [
    "diff --git a/src/user.ts b/src/user.ts",
    "diff --git a/src/auth.ts b/src/auth.ts",
  ].join("\n");

  assert.deepEqual(parseFiles(diffText), ["src/user.ts", "src/auth.ts"]);
});

test("parseChangedLines returns added line numbers across files and hunks", () => {
  const diffText = [
    "diff --git a/src/user.ts b/src/user.ts",
    "@@ -10,0 +11,3 @@",
    "+line1",
    "+line2",
    "+line3",
    "@@ -20,2 +23,2 @@",
    "-old1",
    "-old2",
    "+new1",
    "+new2",
    "diff --git a/src/auth.ts b/src/auth.ts",
    "@@ -1 +1,0 @@",
    "-removedOnly",
    "@@ -5,0 +6 @@",
    "+added",
  ].join("\n");

  assert.deepEqual(toObject(parseChangedLines(diffText)), {
    "src/user.ts": [11, 12, 13, 23, 24],
    "src/auth.ts": [6],
  });
});

test("parseChangedLines handles single-line hunks without explicit counts", () => {
  const diffText = [
    "diff --git a/src/example.ts b/src/example.ts",
    "@@ -8 +9 @@",
    "-before",
    "+after",
  ].join("\n");

  assert.deepEqual(toObject(parseChangedLines(diffText)), {
    "src/example.ts": [9],
  });
});