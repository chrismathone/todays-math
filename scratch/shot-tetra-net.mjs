// 전개도 SVG 를 실제로 그려 PNG 로 남긴다 — 「점선이 나온다」를 눈으로 보려고.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("scratch/tetra-net.svg", "utf8");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 520, height: 560 } });
await p.setContent(
  `<body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center">
     <div style="width:480px">${svg.replace('<svg ', '<svg width="480" height="490" ')}</div>
   </body>`,
);
await p.screenshot({ path: "scratch/tetra-net.png" });
await b.close();
console.log("scratch/tetra-net.png");
