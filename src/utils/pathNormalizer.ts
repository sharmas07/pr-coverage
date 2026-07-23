import { isAbsolute, relative, normalize } from "node:path";
import type { LineCoverage } from "../coverage/parser.js";

export function normalizePath(filePath: string, projectRoot: string): string {
  const normalizedRoot = normalize(projectRoot).replace(/\\/g, "/");
  const normalizedFilePath = normalize(filePath).replace(/\\/g, "/");

  if (isAbsolute(normalizedFilePath)) {
    const relativePath = relative(normalizedRoot, normalizedFilePath).replace(/\\/g, "/");
    return relativePath === "" ? "" : relativePath;
  }

  return normalizedFilePath;
}

export function normalizeChangedLines(
  changedLines: Map<string, Set<number>>,
  projectRoot: string,
): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();

  for (const [filePath, lines] of changedLines) {
    result.set(normalizePath(filePath, projectRoot), lines);
  }

  return result;
}

export function normalizeCoverage(
  coverage: Map<string, Map<number, LineCoverage>>,
  projectRoot: string,
): Map<string, Map<number, LineCoverage>> {
  const result = new Map<string, Map<number, LineCoverage>>();

  for (const [filePath, lineCoverage] of coverage) {
    result.set(normalizePath(filePath, projectRoot), lineCoverage);
  }

  return result;
}
