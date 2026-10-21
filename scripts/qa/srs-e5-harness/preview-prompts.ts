import { PREVIEW_CARDS } from "@/lib/math-srs/preview/cards";
let i = 0;
for (const c of PREVIEW_CARDS) {
  for (const w of c.worked) console.log(`${++i}. ${w.prompt}`);
  console.log(`${++i}. ${c.practice.prompt}`);
}
