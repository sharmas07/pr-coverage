import { execSync } from "node:child_process";
export function getRawDiff() {
    return execSync("git diff main...HEAD --unified=0", {
        encoding: "utf-8",
    });
}
//# sourceMappingURL=diff.js.map