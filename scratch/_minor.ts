import { registeredTypes } from "../src/lib/middle/generate";

type E = {
  key: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
};

const want = process.argv[2] ?? "1-2|다각형";
const all = registeredTypes() as unknown as E[];
for (const e of all) {
  if (`${e.rpmBook}|${e.rpmMinor}` !== want) continue;
  console.log(`${e.rpmType.padEnd(4)} [${e.unitSection}]  ${e.rpmTitle}`);
}
