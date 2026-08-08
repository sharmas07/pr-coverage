import test from "node:test";
import assert from "node:assert/strict";

import { resolveBaseBranch } from "../../src/git/diff.ts";

test("resolveBaseBranch returns requested branch when it exists", () => {
  const exists = (branch: string) => branch === "feature";
  assert.deepEqual(resolveBaseBranch("feature", exists), {
    branch: "feature",
    wasRequestedBranch: true,
  });
});

test("resolveBaseBranch falls back to main when default is requested and main exists", () => {
  const exists = (branch: string) => branch === "main";
  assert.deepEqual(resolveBaseBranch("main", exists), {
    branch: "main",
    wasRequestedBranch: true,
  });
});

test("resolveBaseBranch falls back to master when main is missing", () => {
  const exists = (branch: string) => branch === "master";
  assert.deepEqual(resolveBaseBranch("main", exists), {
    branch: "master",
    wasRequestedBranch: false,
  });
});

test("resolveBaseBranch throws when no candidate exists", () => {
  const exists = () => false;
  assert.throws(() => resolveBaseBranch("main", exists), /No base branch found/);
});

test("resolveBaseBranch prefers explicit requested branch over fallback", () => {
  const exists = (branch: string) => branch === "main" || branch === "develop";
  assert.deepEqual(resolveBaseBranch("develop", exists), {
    branch: "develop",
    wasRequestedBranch: true,
  });
});
