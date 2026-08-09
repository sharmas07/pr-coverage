# Manual Testing Guide

This guide shows how to test `pr-coverage` manually against another repository that already uses Vitest.

## What the CLI Does

When you run:

```bash
pr-coverage --base main --coverage coverage/coverage-final.json --min 80
```

the CLI runs this flow:

1. `parseArgs()` reads flags from the command line.
2. `runCli()` checks `package.json` for a `coverage` script.
3. If the script exists, it runs `npm run coverage`.
4. `getRawDiff()` resolves the base branch and runs `git diff <base>...HEAD --unified=0`.
5. `parseChangedLines()` extracts added executable source lines from the diff.
6. `readCoverageFile()` reads the Istanbul/Vitest `coverage-final.json` file.
7. `normalizeChangedLines()` and `normalizeCoverage()` align diff paths with coverage paths.
8. `analyzeCoverage()` compares changed lines with coverage data.
9. `printReport()` prints the summary and uncovered lines.
10. `main()` exits with `0` when thresholds pass, or `1` when they fail.

Relevant code:

- CLI orchestration: `src/cli.ts`
- CLI flag parsing: `src/cli/args.ts`
- Git diff handling: `src/git/diff.ts`
- Diff parsing: `src/git/parser.ts`
- Coverage parsing: `src/coverage/parser.ts`
- Path normalization: `src/utils/pathNormalizer.ts`
- Coverage analysis: `src/analyzer/analyzer.ts`
- Report formatting: `src/reporter/reporter.ts`

## Prerequisites

Use a separate test repository that has:

- Git initialized
- Vitest installed
- a branch named `main` or `master`
- tests that can generate `coverage/coverage-final.json`
- at least one source file and one test file

The target repository should have a coverage script like this:

```json
{
  "scripts": {
    "coverage": "vitest run --coverage"
  }
}
```

Vitest coverage config should generate JSON coverage:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["json"],
      reportsDirectory: "./coverage",
    },
  },
});
```

## Prepare the CLI Locally

From this `pr-coverage` repository:

```bash
npm install
npm run build
npm link
```

Then move into the separate Vitest repository:

```bash
cd /path/to/your/vitest-repo
npm link pr-coverage
```

Confirm the binary is available:

```bash
which pr-coverage
```

## Test 1: Happy Path With Passing Coverage

Goal: prove the CLI can run coverage, parse changed lines, compare coverage, print a report, and exit `0`.

Steps:

1. Create or switch to a feature branch:

```bash
git checkout -b test-pr-coverage-pass
```

2. Add a covered source change:

```ts
// src/math.ts
export function add(left: number, right: number): number {
  return left + right;
}
```

3. Add a test that covers the changed line:

```ts
// src/math.test.ts
import { describe, expect, it } from "vitest";
import { add } from "./math";

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

4. Commit the change:

```bash
git add src/math.ts src/math.test.ts
git commit -m "test covered math change"
```

5. Run the CLI:

```bash
npx pr-coverage --base main --min 80
echo $?
```

Expected result:

- `npm run coverage` runs first.
- report includes changed files, changed lines, covered lines, and `PR Coverage (Lines)`.
- exit code is `0`.

Code path exercised:

- `hasCoverageScript()` finds `scripts.coverage`.
- `runCoverage()` executes `npm run coverage`.
- `getRawDiff("main")` computes the PR-style diff.
- `analyzeCoverage()` counts the changed covered line.
- `runCli()` returns `0` because coverage is at least `80`.

## Test 2: Failing Line Coverage

Goal: prove uncovered changed lines fail the line threshold.

Steps:

1. Create or modify a source file with an untested changed line:

```ts
// src/math.ts
export function subtract(left: number, right: number): number {
  return left - right;
}
```

2. Do not add a test for `subtract`.

3. Commit the change:

```bash
git add src/math.ts
git commit -m "add untested subtract"
```

4. Run:

```bash
npx pr-coverage --base main --min 80
echo $?
```

Expected result:

- report lists the uncovered `src/math.ts:<line>` entry.
- line coverage is below `80`.
- exit code is `1`.

Code path exercised:

- `parseChangedLines()` records the added executable line.
- `readCoverageFile()` loads coverage that does not mark the changed line as covered.
- `analyzeCoverage()` adds the line to `uncovered`.
- `runCli()` returns `1` because `analysis.coveragePercent < options.min`.

## Test 3: Custom Coverage File Path

Goal: prove `--coverage` changes which coverage file is read.

Steps:

1. Generate coverage:

```bash
npm run coverage
```

2. Copy the generated coverage file:

```bash
mkdir -p tmp-coverage
cp coverage/coverage-final.json tmp-coverage/custom-coverage.json
```

3. Run:

```bash
npx pr-coverage --base main --coverage tmp-coverage/custom-coverage.json --min 0
echo $?
```

Expected result:

- command succeeds.
- exit code is `0` when `--min 0` is used.

Code path exercised:

- `parseArgs()` sets `options.coverage` to `tmp-coverage/custom-coverage.json`.
- `readCoverageFile(options.coverage)` reads that path instead of the default.

## Test 4: Missing Coverage File

Goal: prove missing coverage input fails with exit code `1`.

Steps:

```bash
npx pr-coverage --base main --coverage does-not-exist/coverage-final.json
echo $?
```

Expected result:

- analysis fails.
- stderr includes the file-read error.
- exit code is `1`.

Code path exercised:

- `readCoverageFile()` throws while reading the configured path.
- `runCli()` catches the error, prints the message, and returns `1`.

## Test 5: Base Branch Fallback

Goal: prove branch fallback works when the requested branch is missing.

Steps:

1. Run with a branch that does not exist:

```bash
npx pr-coverage --base definitely-missing-branch --min 0
echo $?
```

Expected result:

- if `main` exists, stderr warns that the requested branch was not found and `main` is used.
- if `main` does not exist but `master` exists, `master` is used.
- if none exist, exit code is `1`.

Code path exercised:

- `resolveBaseBranch()` tries the requested branch, then `main`, then `master`.
- `getRawDiff()` writes the fallback warning when the requested branch is not used.

## Test 6: Branch Coverage Threshold

Goal: prove `--min-branches` fails when changed branch coverage is below threshold.

Steps:

1. Add a changed function with an uncovered branch:

```ts
// src/grade.ts
export function grade(score: number): string {
  if (score >= 90) {
    return "A";
  }

  return "B";
}
```

2. Add a test that only covers one branch:

```ts
// src/grade.test.ts
import { describe, expect, it } from "vitest";
import { grade } from "./grade";

describe("grade", () => {
  it("returns A for high scores", () => {
    expect(grade(95)).toBe("A");
  });
});
```

3. Commit and run:

```bash
git add src/grade.ts src/grade.test.ts
git commit -m "add partially covered branch"
npx pr-coverage --base main --min 0 --min-branches 100
echo $?
```

Expected result:

- report includes `PR Coverage (Branches)`.
- if branch coverage is below `100`, exit code is `1`.

Code path exercised:

- `parseCoverageJson()` reads `branchMap` and `b`.
- `analyzeCoverage()` calculates `branchesTotal`, `branchesCovered`, and `branchPercent`.
- `runCli()` returns `1` when `analysis.branchPercent < options.minBranches`.

## Test 7: Function Coverage Threshold

Goal: prove `--min-functions` fails when a changed function is not covered.

Steps:

1. Add an untested function:

```ts
// src/name.ts
export function formatName(first: string, last: string): string {
  return `${first} ${last}`;
}
```

2. Commit without adding a test:

```bash
git add src/name.ts
git commit -m "add untested name formatter"
```

3. Run:

```bash
npx pr-coverage --base main --min 0 --min-functions 100
echo $?
```

Expected result:

- report includes `PR Coverage (Functions)` when function data exists for changed lines.
- exit code is `1` when function coverage is below `100`.

Code path exercised:

- `parseCoverageJson()` reads `fnMap` and `f`.
- `analyzeCoverage()` calculates `functionsTotal`, `functionsCovered`, and `functionPercent`.
- `runCli()` returns `1` when `analysis.functionPercent < options.minFunctions`.

## Test 8: Repository Without Coverage Script

Goal: prove the CLI can use an existing coverage file without auto-running coverage.

Steps:

1. Generate coverage once:

```bash
npm run coverage
```

2. Temporarily rename the coverage script in `package.json`, for example from `coverage` to `coverage:manual`.

3. Run:

```bash
npx pr-coverage --base main --min 0
echo $?
```

Expected result:

- CLI prints a warning that no coverage script was found.
- CLI reads existing `coverage/coverage-final.json`.
- exit code follows the configured threshold.

Code path exercised:

- `hasCoverageScript()` returns `false`.
- `runCoverage()` is skipped.
- `readCoverageFile("coverage/coverage-final.json")` is still used.

## Test 9: Non-Executable Added Lines Are Ignored

Goal: prove imports and type-only exports do not count as changed executable lines.

Steps:

1. Add only a single-line type-only change:

```ts
// src/types.ts
export type UserId = string;
```

2. Commit and run:

```bash
git add src/types.ts
git commit -m "add type-only file"
npx pr-coverage --base main --min 100
echo $?
```

Expected result:

- the type-only line should not count as a changed executable line.
- if there are no counted changed lines, report shows `Changed lines: 0`.

Code path exercised:

- `isNonExecutableLine()` filters imports, `require(...)`, `export type`, `export interface`, and re-exports from other modules.
- `parseChangedLines()` skips those lines when building the changed-line map.

## Quick Checklist

Use this checklist after running the scenarios:

- `npm run coverage` is executed when the target repo has `scripts.coverage`.
- default coverage path is `coverage/coverage-final.json`.
- `--coverage` overrides the coverage file path.
- `--base` controls the diff base.
- missing base branch falls back to `main` or `master`.
- uncovered changed lines are listed in the report.
- line threshold failure exits `1`.
- branch threshold failure exits `1`.
- function threshold failure exits `1`.
- passing thresholds exit `0`.
