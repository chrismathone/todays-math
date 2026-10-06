import { chromium } from "@playwright/test";
import { readdir,readFile,mkdir,writeFile } from "node:fs/promises";
import { join,resolve,relative } from "node:path";
const root="C:/tmp/srs-v2-mockups";
async function walk(folder){const rows=await readdir(folder,{withFileTypes:true});return(await Promise.all(rows.map(row=>row.isDirectory()?walk(join(folder,row.name)):row.name==="screen.png"?[join(folder,row.name)]:[]))).flat();}
const files=(await walk(root)).sort();
const output=resolve(".qa-artifacts/fading-screens/compare");await mkdir(output,{recursive:true});
const b=await chromium.launch({headless:true});
try{
  const rows=await Promise.all(files.map(async file=>({path:relative(root,file),data:(await readFile(file)).toString("base64")})));
  const page=await b.newPage({viewport:{width:1600,height:680}});
  for(let i=0;i<rows.length;i+=4){await page.setContent(`<html><head><style>body{margin:0;background:#e5eeff;font:13px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px}section{background:white;border-radius:8px;padding:8px}p{height:42px;margin:0;overflow-wrap:anywhere}img{width:100%;height:595px;object-fit:contain;object-position:top}</style></head><body><main>${rows.slice(i,i+4).map(row=>`<section><p>${row.path}</p><img src="data:image/png;base64,${row.data}"/></section>`).join("")}</main></body></html>`);await page.locator("img").evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.screenshot({path:resolve(output,`references-${i/4+1}.png`)});}
  await writeFile(resolve(output,"references.json"),JSON.stringify(rows.map(row=>row.path),null,2));
  process.stdout.write(`${files.length} PNG · ${Math.ceil(files.length/4)} 묶음\n`);
}finally{await b.close();}
