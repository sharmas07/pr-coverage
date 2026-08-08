import test from "node:test";
import assert from "node:assert/strict";

import { isNonExecutableLine, parseChangedLines, parseFiles } from "../../src/git/parser.ts";

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

test("isNonExecutableLine detects import and type-only export statements", () => {
  assert.equal(isNonExecutableLine('+import { foo } from "./foo";'), true);
  assert.equal(isNonExecutableLine('+import type { Foo } from "./foo";'), true);
  assert.equal(isNonExecutableLine('+  import { foo } from "./foo";'), true);
  assert.equal(isNonExecutableLine('+import "./styles.css";'), true);
  assert.equal(isNonExecutableLine("+export type Foo = string;"), true);
  assert.equal(isNonExecutableLine("+export interface Foo {}"), true);
  assert.equal(isNonExecutableLine('+export { foo } from "./foo";'), true);
  assert.equal(isNonExecutableLine("+const foo = 1;"), false);
  assert.equal(isNonExecutableLine("+export { foo };"), false);
});

test("parseChangedLines ignores added import lines", () => {
  const diffText = [
    "diff --git a/src/user.ts b/src/user.ts",
    "@@ -10,0 +11,4 @@",
    '+import { helper } from "./helper";',
    "+const a = 1;",
    "+const b = 2;",
    '+import { another } from "./another";',
    "+const c = 3;",
  ].join("\n");

  assert.deepEqual(toObject(parseChangedLines(diffText)), {
    "src/user.ts": [12, 13, 15],
  });
});
