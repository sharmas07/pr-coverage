import type { CoverageAnalysis } from "../analyzer/analyzer.js";

export function formatReport(analysis: CoverageAnalysis): string {
  const lines: string[] = [];

  lines.push(`Changed files: ${analysis.changedFiles}`);
  lines.push(`Changed lines: ${analysis.changedLines}`);
  lines.push(`Covered lines: ${analysis.coveredLines}`);
  lines.push("");
  lines.push(`PR Coverage: ${analysis.coveragePercent}%`);

  if (analysis.uncovered.length > 0) {
    lines.push("");
    lines.push("Uncovered:");

    for (const { file, line } of analysis.uncovered) {
      lines.push(`${file}:${line}`);
    }
  }

  return lines.join("\n");
}

export function printReport(analysis: CoverageAnalysis): void {
  console.log(formatReport(analysis));
}
