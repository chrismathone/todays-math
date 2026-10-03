/** npx tsx scripts/import/plan-personal-exams.ts <inventory.json> <bank-snapshot.json> <output.json> */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { planPersonalExams, type BankSnapshot, type PersonalExamInventory } from "../../src/lib/import/planPersonalExams";

const [inventoryPath, bankPath, outputPath] = process.argv.slice(2);
if (!inventoryPath || !bankPath || !outputPath) throw new Error("Usage: <inventory.json> <bank-snapshot.json> <output.json>");
const read = (file: string) => JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const result = planPersonalExams(read(inventoryPath) as PersonalExamInventory, read(bankPath) as BankSnapshot);
mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify({ output: path.resolve(outputPath), ...result.summary }, null, 2));
