import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("scratch/lexprobe-input.txt", "utf8");
const { deadBackslashes } = await import("./mid-b-lexer.mjs");
console.log(JSON.stringify(deadBackslashes(src)));
