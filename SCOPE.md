# Project Scope

This file tracks where `pr-coverage` is right now, what has been completed, and what still needs review before calling it production-ready.

## Current State

The `test-pr2` branch has been merged into `main`. The project now implements the core PR coverage workflow:

- parses CLI flags in `src/cli/args.ts`
- detects and runs an npm `coverage` script from `package.json`
- resolves a base branch with fallback from requested branch to `main` and `master`
- generates a raw `git diff <base>...HEAD --unified=0`
- parses changed source lines from the diff
- parses Istanbul/Vitest coverage JSON
- normalizes diff paths and coverage paths
- compares changed lines against coverage data
- generates a readable report
- applies line, branch, and function thresholds with exit codes

## Verified Files

- CLI orchestration: `src/cli.ts`
- CLI option parsing: `src/cli/args.ts`
- Git diff and base branch resolution: `src/git/diff.ts`
- Diff parsing: `src/git/parser.ts`
- Coverage parsing: `src/coverage/parser.ts`
- Path normalization: `src/utils/pathNormalizer.ts`
- Coverage analysis: `src/analyzer/analyzer.ts`
- Reporting: `src/reporter/reporter.ts`

## Done So Far

- Merged `test-pr2` into `main`
- Resolved the README merge conflict
- Updated stale unit tests to match the merged branch/function coverage model
- Removed tracked `.DS_Store` and added it to `.gitignore`
- Replaced `@vitest/coverage-c8` with `@vitest/coverage-v8`
- Added CLI-level workflow tests for coverage execution, missing coverage files, thresholds, success, and `main()` exit behavior
- Verified the test suite: 39 tests passing

## Remaining Review Items

- Consider using dependency injection for CLI orchestration to reduce process-level mocking in future tests
- Verify behavior in a real fixture repository with an actual PR-style diff and coverage report

## Maintenance Rule

Update this file whenever the implementation scope changes, a major phase is completed, or a known risk is closed.
