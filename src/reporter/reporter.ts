import type { CoverageAnalysis } from "../analyzer/analyzer.js";

export function formatReport(analysis: CoverageAnalysis): string {
  const lines: string[] = [];

  lines.push(`Changed files: ${analysis.changedFiles}`);
  lines.push(`Changed lines: ${analysis.changedLines}`);
  lines.push(`Covered lines: ${analysis.coveredLines}`);
  lines.push("");
  lines.push(`PR Coverage (Lines): ${analysis.coveragePercent}%`);
  
  if (analysis.branchesTotal > 0) {
    lines.push(`PR Coverage (Branches): ${analysis.branchPercent}% (${analysis.branchesCovered}/${analysis.branchesTotal})`);
  }
  
  if (analysis.functionsTotal > 0) {
    lines.push(`PR Coverage (Functions): ${analysis.functionPercent}% (${analysis.functionsCovered}/${analysis.functionsTotal})`);
  }

  if (analysis.uncovered.length > 0) {
    lines.push("");
    lines.push("Uncovered Lines/Branches:");

    for (const { file, line, reason } of analysis.uncovered) {
      if (reason === "statement" || reason === "untracked") {
        lines.push(`${file}:${line}`);
      } else {
        lines.push(`${file}:${line} (Missing ${reason} coverage)`);
      }
    }
  }

  return lines.join("\n");
}

export function printReport(analysis: CoverageAnalysis): void {
  console.log(formatReport(analysis));
}
