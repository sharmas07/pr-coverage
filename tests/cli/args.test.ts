import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../../src/cli/args.ts";

test("parseArgs returns defaults", () => {
  assert.deepEqual(parseArgs([]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    min: 80,
  });
});

test("parseArgs parses --base", () => {
  assert.deepEqual(parseArgs(["--base", "develop"]), {
    base: "develop",
    coverage: "coverage/coverage-final.json",
    min: 80,
  });
});

test("parseArgs parses --coverage", () => {
  assert.deepEqual(parseArgs(["--coverage", "coverage/custom.json"]), {
    base: "main",
    coverage: "coverage/custom.json",
    min: 80,
  });
});

test("parseArgs parses --min", () => {
  assert.deepEqual(parseArgs(["--min", "90"]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    min: 90,
  });
});

test("parseArgs ignores invalid --min", () => {
  assert.deepEqual(parseArgs(["--min", "abc"]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    min: 80,
  });
});

test("parseArgs parses multiple flags", () => {
  assert.deepEqual(parseArgs(["--base", "main", "--min", "90", "--coverage", "cov.json"]), {
    base: "main",
    coverage: "cov.json",
    min: 90,
  });
});
