import test from "node:test";
import assert from "node:assert/strict";

import { resolveBaseBranch } from "../../src/git/diff.ts";

test("resolveBaseBranch returns requested branch when it exists", () => {
  const exists = (branch: string) => branch === "feature";
  assert.equal(resolveBaseBranch("feature", exists), "feature");
});

test("resolveBaseBranch falls back to main when default is requested and main exists", () => {
  const exists = (branch: string) => branch === "main";
  assert.equal(resolveBaseBranch("main", exists), "main");
});

test("resolveBaseBranch falls back to master when main is missing", () => {
  const exists = (branch: string) => branch === "master";
  assert.equal(resolveBaseBranch("main", exists), "master");
});

test("resolveBaseBranch throws when no candidate exists", () => {
  const exists = () => false;
  assert.throws(() => resolveBaseBranch("main", exists), /No base branch found/);
});

test("resolveBaseBranch prefers explicit requested branch over fallback", () => {
  const exists = (branch: string) => branch === "main" || branch === "develop";
  assert.equal(resolveBaseBranch("develop", exists), "develop");
});
