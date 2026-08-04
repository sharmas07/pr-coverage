import { readFileSync } from "node:fs";

export interface LineCoverage {
  isStatementCovered: boolean;
  branches: { total: number; covered: number }[];
  isFunctionCovered: boolean | null;
}

interface CoverageFileData {
  path: string;
  l?: Record<string, number>;
  statementMap?: Record<string, StatementLocation>;
  s?: Record<string, number>;
  branchMap?: Record<string, BranchLocation>;
  b?: Record<string, number[]>;
  fnMap?: Record<string, FunctionLocation>;
  f?: Record<string, number>;
}

interface StatementLocation {
  start: { line: number };
  end: { line: number };
}

interface BranchLocation {
  line: number;
  type: string;
  locations: { start: { line: number }; end: { line: number } }[];
}

interface FunctionLocation {
  name: string;
  line: number;
  loc: { start: { line: number }; end: { line: number } };
}

type CoverageJson = Record<string, CoverageFileData>;

export function readCoverageFile(coveragePath: string): Map<string, Map<number, LineCoverage>> {
  const rawText = readFileSync(coveragePath, "utf-8");
  const coverageJson = JSON.parse(rawText) as CoverageJson;

  return parseCoverageJson(coverageJson);
}

export function parseCoverageJson(coverageJson: CoverageJson): Map<string, Map<number, LineCoverage>> {
  const coverage = new Map<string, Map<number, LineCoverage>>();

  for (const filePath of Object.keys(coverageJson)) {
    const fileData = coverageJson[filePath];

    if (!fileData) {
      continue;
    }

    const lineCoverage = parseFileCoverage(fileData);

    if (lineCoverage.size > 0) {
      coverage.set(filePath, lineCoverage);
    }
  }

  return coverage;
}

function getOrCreateLineCoverage(
  lineCoverage: Map<number, LineCoverage>,
  line: number,
): LineCoverage {
  let coverage = lineCoverage.get(line);
  if (!coverage) {
    coverage = {
      isStatementCovered: false,
      branches: [],
      isFunctionCovered: null,
    };
    lineCoverage.set(line, coverage);
  }
  return coverage;
}

function parseFileCoverage(fileData: CoverageFileData): Map<number, LineCoverage> {
  const lineCoverage = new Map<number, LineCoverage>();

  if (fileData.l) {
    parseLineCoverage(fileData.l, lineCoverage);
  } else if (fileData.statementMap && fileData.s) {
    parseStatementCoverage(fileData.statementMap, fileData.s, lineCoverage);
  }

  if (fileData.branchMap && fileData.b) {
    parseBranchCoverage(fileData.branchMap, fileData.b, lineCoverage);
  }

  if (fileData.fnMap && fileData.f) {
    parseFunctionCoverage(fileData.fnMap, fileData.f, lineCoverage);
  }

  return lineCoverage;
}

function parseLineCoverage(lineHits: Record<string, number>, lineCoverage: Map<number, LineCoverage>): void {
  for (const [lineNumber, hitCount] of Object.entries(lineHits)) {
    const coverage = getOrCreateLineCoverage(lineCoverage, Number(lineNumber));
    coverage.isStatementCovered = coverage.isStatementCovered || hitCount > 0;
  }
}

function parseStatementCoverage(
  statementMap: Record<string, StatementLocation>,
  statementHits: Record<string, number>,
  lineCoverage: Map<number, LineCoverage>,
): void {
  for (const statementId of Object.keys(statementMap)) {
    const location = statementMap[statementId];
    const startLine = location?.start?.line;
    const endLine = location?.end?.line;

    if (startLine === undefined || endLine === undefined) {
      continue;
    }

    const hitCount = statementHits[statementId] ?? 0;
    const isCovered = hitCount > 0;

    for (let line = startLine; line <= endLine; line++) {
      const coverage = getOrCreateLineCoverage(lineCoverage, line);
      coverage.isStatementCovered = coverage.isStatementCovered || isCovered;
    }
  }
}

function parseBranchCoverage(
  branchMap: Record<string, BranchLocation>,
  branchHits: Record<string, number[]>,
  lineCoverage: Map<number, LineCoverage>,
): void {
  for (const branchId of Object.keys(branchMap)) {
    const location = branchMap[branchId];
    const line = location?.line ?? location?.locations?.[0]?.start?.line;
    
    if (line === undefined) {
      continue;
    }

    const hits = branchHits[branchId] ?? [];
    const total = location?.locations?.length ?? 0;
    // Count how many branches were taken (hit count > 0)
    const covered = hits.reduce((acc, hit) => acc + (hit > 0 ? 1 : 0), 0);

    const coverage = getOrCreateLineCoverage(lineCoverage, line);
    coverage.branches.push({ total, covered });
  }
}

function parseFunctionCoverage(
  fnMap: Record<string, FunctionLocation>,
  fnHits: Record<string, number>,
  lineCoverage: Map<number, LineCoverage>,
): void {
  for (const fnId of Object.keys(fnMap)) {
    const location = fnMap[fnId];
    const line = location?.line ?? location?.loc?.start?.line;

    if (line === undefined) {
      continue;
    }

    const hitCount = fnHits[fnId] ?? 0;
    const isCovered = hitCount > 0;

    const coverage = getOrCreateLineCoverage(lineCoverage, line);
    if (coverage.isFunctionCovered === null) {
      coverage.isFunctionCovered = isCovered;
    } else {
      coverage.isFunctionCovered = coverage.isFunctionCovered || isCovered;
    }
  }
}
