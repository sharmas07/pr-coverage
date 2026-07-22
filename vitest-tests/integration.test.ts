import { describe, expect, it } from "vitest";
import { parseChangedLines, parseFiles, isSourceFile, isNonExecutableLine } from "../src/git/parser.js";
import { parseCoverageJson } from "../src/coverage/parser.js";
import { normalizePath, normalizeChangedLines, normalizeCoverage } from "../src/utils/pathNormalizer.js";
import { analyzeCoverage } from "../src/analyzer/analyzer.js";
import { formatReport } from "../src/reporter/reporter.js";
import { parseArgs } from "../src/cli/args.js";
import { resolveBaseBranch } from "../src/git/diff.js";

describe("git parser", () => {
  it("parses changed files", () => {
    const diffText = [
      "diff --git a/src/user.ts b/src/user.ts",
      "diff --git a/src/auth.ts b/src/auth.ts",
    ].join("\n");

    expect(parseFiles(diffText)).toEqual(["src/user.ts", "src/auth.ts"]);
  });

  it("parses changed lines", () => {
    const diffText = [
      "diff --git a/src/user.ts b/src/user.ts",
      "@@ -10,0 +11,3 @@",
      "+line1",
      "+line2",
      "+line3",
    ].join("\n");

    const changedLines = parseChangedLines(diffText);
    expect(Array.from(changedLines.get("src/user.ts") ?? [])).toEqual([11, 12, 13]);
  });

  it("excludes non-source files from changed lines", () => {
    const diffText = [
      "diff --git a/README.md b/README.md",
      "@@ -0,0 +1,3 @@",
      "+# Title",
      "+Some text",
      "+More text",
      "diff --git a/src/user.ts b/src/user.ts",
      "@@ -10,0 +11,2 @@",
      "+line1",
      "+line2",
    ].join("\n");

    const changedLines = parseChangedLines(diffText);
    expect(changedLines.has("README.md")).toBe(false);
    expect(changedLines.has("src/user.ts")).toBe(true);
    expect(Array.from(changedLines.get("src/user.ts") ?? [])).toEqual([11, 12]);
  });

  it("excludes config and data files", () => {
    const diffText = [
      "diff --git a/package.json b/package.json",
      "@@ -0,0 +1,1 @@",
      '+{"name": "test"}',
      "diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml",
      "@@ -0,0 +1,1 @@",
      "+name: CI",
      "diff --git a/styles.css b/styles.css",
      "@@ -0,0 +1,1 @@",
      "+body { color: red; }",
    ].join("\n");

    const changedLines = parseChangedLines(diffText);
    expect(changedLines.size).toBe(0);
  });
});

describe("isSourceFile", () => {
  it("accepts TypeScript and JavaScript files", () => {
    expect(isSourceFile("src/user.ts")).toBe(true);
    expect(isSourceFile("src/user.tsx")).toBe(true);
    expect(isSourceFile("src/user.js")).toBe(true);
    expect(isSourceFile("src/user.jsx")).toBe(true);
    expect(isSourceFile("src/user.mjs")).toBe(true);
    expect(isSourceFile("src/user.cjs")).toBe(true);
  });

  it("rejects non-source files", () => {
    expect(isSourceFile("README.md")).toBe(false);
    expect(isSourceFile("package.json")).toBe(false);
    expect(isSourceFile(".gitignore")).toBe(false);
    expect(isSourceFile("styles.css")).toBe(false);
    expect(isSourceFile("config.yml")).toBe(false);
    expect(isSourceFile("image.png")).toBe(false);
  });
});

describe("isNonExecutableLine", () => {
  it("detects import statements", () => {
    expect(isNonExecutableLine('+import { foo } from "bar";')).toBe(true);
    expect(isNonExecutableLine("+  import type { Foo } from 'bar';")).toBe(true);
  });

  it("detects require calls", () => {
    expect(isNonExecutableLine('+const foo = require("bar");')).toBe(false);
    expect(isNonExecutableLine('+require("bar");')).toBe(true);
    expect(isNonExecutableLine("+  require('setup');")).toBe(true);
  });

  it("detects export type and export interface", () => {
    expect(isNonExecutableLine("+export type Foo = string;")).toBe(true);
    expect(isNonExecutableLine("+export interface Bar {}")).toBe(true);
  });

  it("detects re-exports", () => {
    expect(isNonExecutableLine('+export { foo } from "bar";')).toBe(true);
    expect(isNonExecutableLine('+export { foo, bar } from "./utils";')).toBe(true);
  });

  it("does not filter regular code", () => {
    expect(isNonExecutableLine("+const x = 1;")).toBe(false);
    expect(isNonExecutableLine("+function foo() {}")).toBe(false);
    expect(isNonExecutableLine("+export function foo() {}")).toBe(false);
    expect(isNonExecutableLine("+export const x = 1;")).toBe(false);
  });
});

describe("coverage parser", () => {
  it("parses line coverage format", () => {
    const coverageJson = {
      "/project/src/user.ts": {
        path: "/project/src/user.ts",
        l: { "11": 1, "12": 0 },
      },
    };

    const coverage = parseCoverageJson(coverageJson);
    expect(coverage.get("/project/src/user.ts")?.get(11)).toBe(true);
    expect(coverage.get("/project/src/user.ts")?.get(12)).toBe(false);
  });

  it("parses statement coverage with multi-line statements", () => {
    const coverageJson = {
      "/project/src/user.ts": {
        path: "/project/src/user.ts",
        statementMap: {
          "0": { start: { line: 3 }, end: { line: 6 } },
          "1": { start: { line: 8 }, end: { line: 8 } },
        },
        s: { "0": 5, "1": 0 },
      },
    };

    const coverage = parseCoverageJson(coverageJson);
    const fileCoverage = coverage.get("/project/src/user.ts")!;

    // Multi-line statement (lines 3-6) should all be covered
    expect(fileCoverage.get(3)).toBe(true);
    expect(fileCoverage.get(4)).toBe(true);
    expect(fileCoverage.get(5)).toBe(true);
    expect(fileCoverage.get(6)).toBe(true);

    // Single-line uncovered statement
    expect(fileCoverage.get(8)).toBe(false);
  });
});

describe("path normalizer", () => {
  it("normalizes absolute paths", () => {
    expect(
      normalizePath("/Users/apple/project/src/user.ts", "/Users/apple/project"),
    ).toBe("src/user.ts");
  });

  it("normalizes maps of changed lines", () => {
    const changedLines = new Map<string, Set<number>>([
      ["/Users/apple/project/src/user.ts", new Set([11])],
    ]);

    const normalized = normalizeChangedLines(changedLines, "/Users/apple/project");
    expect(normalized.has("src/user.ts")).toBe(true);
  });

  it("normalizes maps of coverage", () => {
    const coverage = new Map<string, Map<number, boolean>>([
      ["/Users/apple/project/src/user.ts", new Map([[11, true]])],
    ]);

    const normalized = normalizeCoverage(coverage, "/Users/apple/project");
    expect(normalized.has("src/user.ts")).toBe(true);
  });
});

describe("analyzer", () => {
  it("analyzes coverage for fully tracked lines", () => {
    const changedLines = new Map<string, Set<number>>([
      ["src/user.ts", new Set([11, 12, 13])],
    ]);

    const coverage = new Map<string, Map<number, boolean>>([
      ["src/user.ts", new Map([[11, true], [12, true], [13, false]])],
    ]);

    const analysis = analyzeCoverage(changedLines, coverage);
    expect(analysis.coveragePercent).toBe(67);
    expect(analysis.uncovered).toEqual([{ file: "src/user.ts", line: 13 }]);
  });

  it("skips non-instrumentable lines in tracked files", () => {
    // Lines 11, 12, 13 are changed. Coverage only tracks 11 and 13.
    // Line 12 is a comment/type/blank — not tracked by instrumenter.
    const changedLines = new Map<string, Set<number>>([
      ["src/user.ts", new Set([11, 12, 13])],
    ]);

    const coverage = new Map<string, Map<number, boolean>>([
      ["src/user.ts", new Map([[11, true], [13, true]])],
      // Line 12 is NOT in the map — it's non-instrumentable
    ]);

    const analysis = analyzeCoverage(changedLines, coverage);
    // Only 2 lines counted (11 and 13), both covered → 100%
    expect(analysis.changedLines).toBe(2);
    expect(analysis.coveredLines).toBe(2);
    expect(analysis.coveragePercent).toBe(100);
  });

  it("counts all lines as uncovered for files with no coverage data", () => {
    const changedLines = new Map<string, Set<number>>([
      ["src/newFile.ts", new Set([1, 2, 3])],
    ]);

    const coverage = new Map<string, Map<number, boolean>>();

    const analysis = analyzeCoverage(changedLines, coverage);
    expect(analysis.changedLines).toBe(3);
    expect(analysis.coveredLines).toBe(0);
    expect(analysis.coveragePercent).toBe(0);
    expect(analysis.uncovered.length).toBe(3);
  });

  it("excludes files where all changed lines are non-instrumentable", () => {
    const changedLines = new Map<string, Set<number>>([
      ["src/types.ts", new Set([1, 2, 3])],
    ]);

    // File is tracked but none of the changed lines are instrumented
    const coverage = new Map<string, Map<number, boolean>>([
      ["src/types.ts", new Map([[10, true]])], // Only line 10 tracked, not 1-3
    ]);

    const analysis = analyzeCoverage(changedLines, coverage);
    expect(analysis.changedFiles).toBe(0); // File excluded from report
    expect(analysis.changedLines).toBe(0);
    expect(analysis.coveragePercent).toBe(0);
  });
});

describe("reporter", () => {
  it("formats report", () => {
    const analysis = {
      changedFiles: 1,
      changedLines: 3,
      coveredLines: 2,
      coveragePercent: 67,
      uncovered: [{ file: "src/user.ts", line: 13 }],
      files: [{ file: "src/user.ts", changed: 3, covered: 2, uncovered: [13] }],
    };

    const report = formatReport(analysis);
    expect(report).toContain("PR Coverage: 67%");
    expect(report).toContain("src/user.ts:13");
  });
});

describe("cli args", () => {
  it("parses default args", () => {
    expect(parseArgs([])).toEqual({
      base: "main",
      coverage: "coverage/coverage-final.json",
      min: 80,
    });
  });

  it("parses flags", () => {
    expect(parseArgs(["--base", "develop", "--min", "90"])).toEqual({
      base: "develop",
      coverage: "coverage/coverage-final.json",
      min: 90,
    });
  });
});

describe("resolveBaseBranch", () => {
  it("returns the requested branch when it exists", () => {
    const exists = (b: string) => b === "develop";
    const result = resolveBaseBranch("develop", exists);
    expect(result).toEqual({ branch: "develop", wasRequestedBranch: true });
  });

  it("falls back to main when requested branch is missing", () => {
    const exists = (b: string) => b === "main";
    const result = resolveBaseBranch("develop", exists);
    expect(result).toEqual({ branch: "main", wasRequestedBranch: false });
  });

  it("falls back to master when main is also missing", () => {
    const exists = (b: string) => b === "master";
    const result = resolveBaseBranch("develop", exists);
    expect(result).toEqual({ branch: "master", wasRequestedBranch: false });
  });

  it("throws when no branch is found", () => {
    const exists = () => false;
    expect(() => resolveBaseBranch("develop", exists)).toThrow("No base branch found");
  });
});
