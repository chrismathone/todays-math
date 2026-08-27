import { writeFileSync } from "node:fs";
import { FIGURE_TETRA_NET } from "../src/lib/middle/m1Geo1";
writeFileSync(
  "scratch/tetra-net.spec.json",
  JSON.stringify(FIGURE_TETRA_NET),
  "utf8",
);
console.log("written");
