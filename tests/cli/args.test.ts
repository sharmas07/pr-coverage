import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../../src/cli/args.ts";

test("parseArgs returns defaults", () => {
  assert.deepEqual(parseArgs([]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    debug: false,
    min: 80,
  });
});

test("parseArgs parses --base", () => {
  assert.deepEqual(parseArgs(["--base", "develop"]), {
    base: "develop",
    coverage: "coverage/coverage-final.json",
    debug: false,
    min: 80,
  });
});

test("parseArgs parses --coverage", () => {
  assert.deepEqual(parseArgs(["--coverage", "coverage/custom.json"]), {
    base: "main",
    coverage: "coverage/custom.json",
    debug: false,
    min: 80,
  });
});

test("parseArgs parses --debug", () => {
  assert.deepEqual(parseArgs(["--debug"]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    debug: true,
    min: 80,
  });
});

test("parseArgs parses --min", () => {
  assert.deepEqual(parseArgs(["--min", "90"]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    debug: false,
    min: 90,
  });
});

test("parseArgs ignores invalid --min", () => {
  assert.deepEqual(parseArgs(["--min", "abc"]), {
    base: "main",
    coverage: "coverage/coverage-final.json",
    debug: false,
    min: 80,
  });
});

test("parseArgs parses multiple flags", () => {
  assert.deepEqual(parseArgs(["--base", "main", "--min", "90", "--coverage", "cov.json", "--debug"]), {
    base: "main",
    coverage: "cov.json",
    debug: true,
    min: 90,
  });
});
