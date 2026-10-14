import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  TRIANGLE_GEOMETRY_DEFINITIONS as definitions,
  TRIANGLE_GEOMETRY_FIGURES as figures,
} from "../../src/lib/arithmetic-v2/families/geometryTriangles";

const directory = join(tmpdir(), "geometryTriangles-20261015");
mkdirSync(directory, { recursive: true });
const cases = definitions.flatMap((def) =>
  Array.from({ length: def.domainSize }, (_, i) => {
    const c = def.problemAt(i);
    if (c.prompt.layout !== "math") throw Error("math prompt required");
    return {
      id: c.prompt.figureId!,
      family: def.id,
      title: def.title,
      given: c.prompt.text,
      instruction: c.prompt.instruction,
      svg: figures[c.prompt.figureId!],
    };
  }),
);
const html = `<!doctype html><meta charset="utf-8"><title>Triangle geometry arithmetic proof</title>
<style>body{font:16px Arial,sans-serif;margin:24px;background:#f4f4f4;color:black}h1{font-size:22px}main{display:grid;grid-template-columns:repeat(4,250px);gap:12px}article{background:white;padding:12px;border:1px solid #bbb}article h2{font-size:17px;margin:0 0 10px}article p{line-height:1.5;margin:6px 0}svg{display:block;width:216px;height:216px}#probe{position:absolute;left:0;top:0;width:216px;visibility:hidden}.id{font-size:11px;overflow-wrap:anywhere}</style>
<h1>중2·중3 삼각형 도형 연산 — 216px 표시 검증</h1><p id="status"></p><main></main><div id="probe"></div>
<script>const cases=${JSON.stringify(cases).replace(/</g, "\\u003c")};
const main=document.querySelector('main');
const chosen=[];for(const c of cases){if(!chosen.some(x=>x.family===c.family))chosen.push(c)}
for(const c of chosen){const a=document.createElement('article');const h=document.createElement('h2');h.textContent=c.title;const p=document.createElement('p');p.textContent=c.given;const instruction=document.createElement('p');instruction.textContent=c.instruction;const picture=document.createElement('div');picture.innerHTML=c.svg;const id=document.createElement('p');id.className='id';id.textContent=c.id;a.append(h,p,picture,instruction,id);main.append(a)}
document.querySelector('#status').textContent=chosen.length+' types / '+cases.length+' finite figures. All values are givens; answers are absent.';
window.runGeometryTrianglesAudit=()=>{
 const issues=[];let labels=0,leaders=0,minFont=Infinity;const probe=document.querySelector('#probe');
 const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const c of cases){probe.innerHTML=c.svg;const svg=probe.querySelector('svg');const texts=[...svg.querySelectorAll('text')];const boxes=texts.map(t=>t.getBBox());
  texts.forEach((t,i)=>{const b=boxes[i],name=t.getAttribute('data-drill-label');labels++;minFont=Math.min(minFont,parseFloat(getComputedStyle(t).fontSize)*216/240);if(b.x<0||b.y<0||b.x+b.width>240||b.y+b.height>240)issues.push({id:c.id,kind:'clipped-label',name});for(let j=0;j<i;j++)if(intersects(b,boxes[j]))issues.push({id:c.id,kind:'overlap-label',name,other:texts[j].textContent});});
  for(const shape of svg.querySelectorAll('line,path,circle')){if(shape.hasAttribute('data-leader'))leaders++;const n=Math.max(1,Math.ceil(shape.getTotalLength()));for(let j=0;j<=n;j++){const p=shape.getPointAtLength(j*shape.getTotalLength()/n);for(let i=0;i<boxes.length;i++){const b=boxes[i];if(p.x>b.x-1&&p.x<b.x+b.width+1&&p.y>b.y-1&&p.y<b.y+b.height+1){issues.push({id:c.id,kind:'geometry-label',name:texts[i].getAttribute('data-drill-label'),shape:shape.outerHTML});j=n+1;break}}}}
 }
 probe.innerHTML='';return {figures:cases.length,types:chosen.length,labels,leaders,minDisplayedFont:minFont,issues};
};</script>`;
writeFileSync(join(directory, "gallery.html"), html);
const report = {
  types: definitions.length,
  candidates: cases.length,
  svgBytes: cases.reduce((n, c) => n + Buffer.byteLength(c.svg), 0),
  mapSha256: createHash("sha256")
    .update(JSON.stringify(Object.fromEntries(cases.map((c) => [c.id, c.svg]))))
    .digest("hex"),
  domains: definitions.map((d) => ({
    id: d.id,
    grade: d.grade,
    count: d.domainSize,
  })),
};
writeFileSync(join(directory, "domains.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ directory, ...report }, null, 2));
