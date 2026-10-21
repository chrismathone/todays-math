import { mkdir, writeFile } from "node:fs/promises";
import { simulateFourteenDays, verifyQuotaPolicy } from "./memory";
async function run() {
  const output =
    "/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/policy";
  const evidence = {
    simulation: await simulateFourteenDays(),
    quotas: await verifyQuotaPolicy(),
  };
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/memory.json`, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      days: evidence.simulation.days.length,
      mainRatings: evidence.simulation.mainRatings,
      shortChecks: evidence.simulation.shortChecks,
      teacherPlanPreserved: evidence.quotas.teacherPlanPreserved,
    }),
  );
}
void run();
