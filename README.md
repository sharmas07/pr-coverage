# pr-coverage

CLI that measures coverage of changed lines in a pull request using an existing Vitest coverage report.

For a deeper walkthrough of the code paths, parsing rules, and report flow, see [ARCHITECTURE.md](/Users/apple/projects/pr-coverage/ARCHITECTURE.md).

## Installation

```bash
npm install -g pr-coverage
```

## Usage

```bash
pr-coverage
pr-coverage --base main
pr-coverage --coverage coverage/coverage-final.json
pr-coverage --min 90
pr-coverage --min-branches 85 --min-functions 90
```

If your project has an npm script named `coverage`, `pr-coverage` will run it first to generate fresh coverage data before analyzing the report.


### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--base` | Base branch to compare against | `main` (falls back to `master` if `main` is missing) |
| `--coverage` | Path to `coverage-final.json` | `coverage/coverage-final.json` |
| `--min` | Minimum required coverage percentage | `80` |
| `--min-branches` | Minimum required branch coverage percentage when branch data exists | Uses `--min` |
| `--min-functions` | Minimum required function coverage percentage when function data exists | Uses `--min` |

## How It Works

`pr-coverage` follows this runtime sequence:

1. Parse the CLI flags
2. Run `npm run coverage` when a `coverage` script exists in `package.json`
3. Resolve the base branch and generate `git diff <base>...HEAD --unified=0`
4. Parse changed source lines from the diff
5. Read `coverage/coverage-final.json` or the path passed with `--coverage`
6. Normalize file paths so diff paths and coverage paths line up
7. Compare changed lines against coverage data
8. Print the final report
9. Exit `0` or `1` based on the configured thresholds

## Output

```text
Changed files: 3
Changed lines: 28
Covered lines: 25

PR Coverage (Lines): 89%

PR Coverage (Branches): 92% (46/50)
PR Coverage (Functions): 95% (38/40)

Uncovered Lines/Branches:
src/services/user.ts:44
src/services/user.ts:57
src/api/auth.ts:19 (Missing branch coverage)
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | PR coverage meets the threshold |
| `1` | Coverage below threshold, missing coverage report, or git failure |

## Requirements

- Vitest with `@vitest/coverage-c8` or another Istanbul-compatible reporter
- Coverage reporter configured to produce `coverage-final.json`
- Git repository with the base branch available

## Architecture

See [ARCHITECTURE.md](/Users/apple/projects/pr-coverage/ARCHITECTURE.md) for a detailed view of:

- command flow
- diff parsing
- coverage parsing
- analyzer logic
- report generation

## CI Example (GitHub Actions)

```yaml
name: PR Coverage
on: [pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx pr-coverage --min 80
```


## Vitest configuration

Add the JSON reporter to your Vitest config so `coverage-final.json` is generated:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "c8",
      reporter: ["json"],
      reportsDirectory: "./coverage",
    },
  },
});
```
