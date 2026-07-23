import type { LineCoverage } from "../coverage/parser.js";

export interface FileCoverageResult {
  file: string;
  changed: number;
  covered: number;
  uncovered: number[];
  
  // Branch stats for this file
  branchesTotal: number;
  branchesCovered: number;
  
  // Function stats for this file
  functionsTotal: number;
  functionsCovered: number;
}

export interface UncoveredLine {
  file: string;
  line: number;
  reason: "statement" | "branch" | "function" | "untracked";
}

export interface CoverageAnalysis {
  changedFiles: number;
  changedLines: number;
  coveredLines: number;
  coveragePercent: number;
  
  branchesTotal: number;
  branchesCovered: number;
  branchPercent: number;
  
  functionsTotal: number;
  functionsCovered: number;
  functionPercent: number;

  uncovered: UncoveredLine[];
  files: FileCoverageResult[];
}

export function analyzeCoverage(
  changedLines: Map<string, Set<number>>,
  coverage: Map<string, Map<number, LineCoverage>>,
): CoverageAnalysis {
  const files: FileCoverageResult[] = [];
  const uncovered: UncoveredLine[] = [];
  
  let changedLinesTotal = 0;
  let coveredLinesTotal = 0;
  
  let totalBranches = 0;
  let coveredBranches = 0;
  
  let totalFunctions = 0;
  let coveredFunctions = 0;

  for (const [filePath, changedLineNumbers] of changedLines) {
    const fileCoverage = coverage.get(filePath);
    let fileLinesCovered = 0;
    let fileLinesCounted = 0;
    const fileUncovered: number[] = [];
    
    let fileBranchesTotal = 0;
    let fileBranchesCovered = 0;
    
    let fileFunctionsTotal = 0;
    let fileFunctionsCovered = 0;

    for (const lineNumber of changedLineNumbers) {
      if (fileCoverage) {
        if (!fileCoverage.has(lineNumber)) {
          continue;
        }

        const lineData = fileCoverage.get(lineNumber)!;
        fileLinesCounted += 1;
        changedLinesTotal += 1;
        
        let isFullyCovered = true;
        let reason: UncoveredLine["reason"] | null = null;
        
        // Check statement
        if (!lineData.isStatementCovered) {
          isFullyCovered = false;
          reason = "statement";
        }
        
        // Check branches
        let lineBranchesTotal = 0;
        let lineBranchesCovered = 0;
        for (const b of lineData.branches) {
          lineBranchesTotal += b.total;
          lineBranchesCovered += b.covered;
        }
        if (lineBranchesTotal > 0) {
          fileBranchesTotal += lineBranchesTotal;
          fileBranchesCovered += lineBranchesCovered;
          totalBranches += lineBranchesTotal;
          coveredBranches += lineBranchesCovered;
          
          if (lineBranchesCovered < lineBranchesTotal && isFullyCovered) {
            isFullyCovered = false;
            reason = "branch";
          }
        }
        
        // Check functions
        if (lineData.isFunctionCovered !== null) {
          fileFunctionsTotal += 1;
          totalFunctions += 1;
          if (lineData.isFunctionCovered) {
            fileFunctionsCovered += 1;
            coveredFunctions += 1;
          } else if (isFullyCovered) {
            isFullyCovered = false;
            reason = "function";
          }
        }

        if (isFullyCovered) {
          fileLinesCovered += 1;
          coveredLinesTotal += 1;
        } else {
          fileUncovered.push(lineNumber);
          uncovered.push({ file: filePath, line: lineNumber, reason: reason || "statement" });
        }
      } else {
        fileLinesCounted += 1;
        changedLinesTotal += 1;
        fileUncovered.push(lineNumber);
        uncovered.push({ file: filePath, line: lineNumber, reason: "untracked" });
      }
    }

    if (fileLinesCounted > 0) {
      files.push({
        file: filePath,
        changed: fileLinesCounted,
        covered: fileLinesCovered,
        uncovered: fileUncovered.sort((left, right) => left - right),
        branchesTotal: fileBranchesTotal,
        branchesCovered: fileBranchesCovered,
        functionsTotal: fileFunctionsTotal,
        functionsCovered: fileFunctionsCovered,
      });
    }
  }

  const coveragePercent =
    changedLinesTotal === 0 ? 0 : Math.round((coveredLinesTotal / changedLinesTotal) * 100);
  const branchPercent =
    totalBranches === 0 ? 100 : Math.round((coveredBranches / totalBranches) * 100);
  const functionPercent =
    totalFunctions === 0 ? 100 : Math.round((coveredFunctions / totalFunctions) * 100);

  return {
    changedFiles: files.length,
    changedLines: changedLinesTotal,
    coveredLines: coveredLinesTotal,
    coveragePercent,
    
    branchesTotal: totalBranches,
    branchesCovered: coveredBranches,
    branchPercent,
    
    functionsTotal: totalFunctions,
    functionsCovered: coveredFunctions,
    functionPercent,

    uncovered: uncovered.sort((left, right) => {
      if (left.file !== right.file) {
        return left.file.localeCompare(right.file);
      }
      return left.line - right.line;
    }),
    files,
  };
}
