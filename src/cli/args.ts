export interface CliOptions {
  base: string;
  coverage: string;
  min: number;
  minBranches?: number;
  minFunctions?: number;
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    base: "main",
    coverage: "coverage/coverage-final.json",
    min: 80,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--base" && nextArg) {
      options.base = nextArg;
      i += 1;
    } else if (arg === "--coverage" && nextArg) {
      options.coverage = nextArg;
      i += 1;
    } else if (arg === "--min" && nextArg) {
      const parsedMin = Number(nextArg);
      options.min = Number.isNaN(parsedMin) ? 80 : parsedMin;
      i += 1;
    } else if (arg === "--min-branches" && nextArg) {
      const parsedMin = Number(nextArg);
      if (!Number.isNaN(parsedMin)) {
        options.minBranches = parsedMin;
      }
      i += 1;
    } else if (arg === "--min-functions" && nextArg) {
      const parsedMin = Number(nextArg);
      if (!Number.isNaN(parsedMin)) {
        options.minFunctions = parsedMin;
      }
      i += 1;
    }
  }

  return options;
}
