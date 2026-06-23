#!/usr/bin/env node
import { getRawDiff } from "./git/diff.js";
import { parseChangedLines } from "./git/parser.js";

const diffText = getRawDiff();
const changedLines = parseChangedLines(diffText);

console.log(changedLines);