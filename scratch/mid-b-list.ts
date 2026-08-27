import { registeredTypes } from "../src/lib/middle/generate";
import { MID_SUP_B } from "../src/lib/middle/midSupB";
const reg = new Set(registeredTypes().map((e) => e.key));
for (const e of MID_SUP_B)
  console.log(
    `${e.key}\t${e.grade}|${e.unitSection}\t${e.rpmTitle}\t${reg.has(e.key) ? "" : "미등록"}`,
  );
console.log("합계", MID_SUP_B.length);
