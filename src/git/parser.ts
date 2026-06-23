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
      currentFile = filePath;
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
      getOrCreateFileLines(changedLines, currentFile).add(currentLine);
      currentLine += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      currentLine += 1;
    }
  }

  return changedLines;
}