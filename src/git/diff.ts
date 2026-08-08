import { execFileSync } from "node:child_process";

const COLORS = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

export function getRepoRoot(): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
  }).trim();
}

export function branchExists(branch: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", branch], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export interface ResolvedBranch {
  branch: string;
  wasRequestedBranch: boolean;
}

export function resolveBaseBranch(
  requested: string = "main",
  exists: (branch: string) => boolean = branchExists,
): ResolvedBranch {
  const candidates = [requested];

  if (requested !== "main") {
    candidates.push("main");
  }

  if (requested !== "master") {
    candidates.push("master");
  }

  for (const branch of candidates) {
    if (exists(branch)) {
      return { branch, wasRequestedBranch: branch === requested };
    }
  }

  throw new Error(
    `No base branch found. Tried: ${[...new Set(candidates)].join(", ")}`,
  );
}

export function getRawDiff(base: string = "main"): string {
  const resolved = resolveBaseBranch(base);

  if (!resolved.wasRequestedBranch) {
    process.stderr.write(
      `${COLORS.yellow}⚠ Branch "${base}" not found, using "${resolved.branch}" instead${COLORS.reset}\n`,
    );
  }

  return execFileSync("git", ["diff", `${resolved.branch}...HEAD`, "--unified=0"], {
    encoding: "utf-8",
  });
}