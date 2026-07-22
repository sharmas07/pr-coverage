import { extname } from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

export function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function parseDiffFileHeader(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);

  return match?.[2] ?? null;
}

function parseHunkHeader(line: string): number | null {
  const match = line.match(/^@@ -[0-9]+(?:,[0-9]+)? \+([0-9]+)(?:,[0-9]+)? @@/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function getOrCreateFileLines(
  changedLines: Map<string, Set<number>>,
  filePath: string,
): Set<number> {
  let fileLines = changedLines.get(filePath);

  if (!fileLines) {
    fileLines = new Set<number>();
    changedLines.set(filePath, fileLines);
  }

  return fileLines;
}

export function isNonExecutableLine(line: string): boolean {
  const content = line.slice(1);
  return (
    /^\s*import\b/.test(content) ||
    /^\s*require\s*\(/.test(content) ||
    /^\s*export\s+type\b/.test(content) ||
    /^\s*export\s+interface\b/.test(content) ||
    /^\s*export\s*\{[^}]*\}\s*from\b/.test(content)
  );
}

export function parseFiles(diffText: string): string[] {
  const files: string[] = [];
  const seenFiles = new Set<string>();

  for (const line of diffText.split("\n")) {
    const filePath = parseDiffFileHeader(line);

    if (filePath && !seenFiles.has(filePath)) {
      seenFiles.add(filePath);
      files.push(filePath);
    }
  }

  return files;
}

export function parseChangedLines(diffText: string): Map<string, Set<number>> {
  const changedLines = new Map<string, Set<number>>();
  let currentFile: string | null = null;
  let currentLine: number | null = null;

  for (const line of diffText.split("\n")) {
    const filePath = parseDiffFileHeader(line);

    if (filePath) {
      currentFile = isSourceFile(filePath) ? filePath : null;
      currentLine = null;
      continue;
    }

    const hunkStart = parseHunkHeader(line);

    if (hunkStart !== null) {
      currentLine = hunkStart;
      continue;
    }

    if (!currentFile || currentLine === null) {
      continue;
    }

    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      continue;
    }

    if (line.startsWith("+")) {
      if (!isNonExecutableLine(line)) {
        getOrCreateFileLines(changedLines, currentFile).add(currentLine);
      }
      currentLine += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      currentLine += 1;
    }
  }

  return changedLines;
}