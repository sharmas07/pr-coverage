# pr-coverage

CLI that measures coverage of changed lines in a pull request using an existing Vitest coverage report.

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
```

If your project has an npm script named `coverage`, `pr-coverage` will run it first to generate fresh coverage data before analyzing the report.


### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--base` | Base branch to compare against | `main` (falls back to `master` if `main` is missing) |
| `--coverage` | Path to `coverage-final.json` | `coverage/coverage-final.json` |
| `--min` | Minimum required coverage percentage | `80` |

## Output

```text
Changed files: 3
Changed lines: 28
Covered lines: 25

PR Coverage: 89%

Uncovered:
src/services/user.ts:44
src/services/user.ts:57
src/api/auth.ts:19
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
