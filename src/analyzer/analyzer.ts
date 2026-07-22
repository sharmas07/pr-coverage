export interface FileCoverageResult {
  file: string;
  changed: number;
  covered: number;
  uncovered: number[];
}

export interface CoverageAnalysis {
  changedFiles: number;
  changedLines: number;
  coveredLines: number;
  coveragePercent: number;
  uncovered: Array<{ file: string; line: number }>;
  files: FileCoverageResult[];
}

export function analyzeCoverage(
  changedLines: Map<string, Set<number>>,
  coverage: Map<string, Map<number, boolean>>,
): CoverageAnalysis {
  const files: FileCoverageResult[] = [];
  const uncovered: Array<{ file: string; line: number }> = [];
  let changedLinesTotal = 0;
  let coveredLinesTotal = 0;

  for (const [filePath, changedLineNumbers] of changedLines) {
    const fileCoverage = coverage.get(filePath);
    let covered = 0;
    let countedLines = 0;
    const fileUncovered: number[] = [];

    for (const lineNumber of changedLineNumbers) {
      if (fileCoverage) {
        // File is tracked by instrumenter — only count lines it knows about
        if (!fileCoverage.has(lineNumber)) {
          // Line not tracked (comment, type, blank, closing brace) — skip
          continue;
        }

        countedLines += 1;
        changedLinesTotal += 1;

        if (fileCoverage.get(lineNumber)) {
          covered += 1;
          coveredLinesTotal += 1;
        } else {
          fileUncovered.push(lineNumber);
          uncovered.push({ file: filePath, line: lineNumber });
        }
      } else {
        // File has no coverage data at all (new file with no tests) — count as uncovered
        countedLines += 1;
        changedLinesTotal += 1;
        fileUncovered.push(lineNumber);
        uncovered.push({ file: filePath, line: lineNumber });
      }
    }

    if (countedLines > 0) {
      files.push({
        file: filePath,
        changed: countedLines,
        covered,
        uncovered: fileUncovered.sort((left, right) => left - right),
      });
    }
  }

  const coveragePercent =
    changedLinesTotal === 0 ? 0 : Math.round((coveredLinesTotal / changedLinesTotal) * 100);

  return {
    changedFiles: files.length,
    changedLines: changedLinesTotal,
    coveredLines: coveredLinesTotal,
    coveragePercent,
    uncovered: uncovered.sort((left, right) => {
      if (left.file !== right.file) {
        return left.file.localeCompare(right.file);
      }

      return left.line - right.line;
    }),
    files,
  };
}
