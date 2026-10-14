/** Standalone, read-only SVG gallery; does not start Next, access DB or write files.
 * Run with the installed tsx CLI. Optional NODE_PATH points to the existing deps.
 * Browser: /?family=0 ; window.auditAll() measures all finite SVGs at 216px.
 */
import { createServer } from "node:http";
import {
  MEASUREMENT_GEOMETRY_DEFINITIONS as defs,
  MEASUREMENT_GEOMETRY_FIGURES as figures,
} from "../../src/lib/arithmetic-v2/families/geometryMeasure";
const port = Number(process.argv[2] ?? 4743);
const rows = defs.flatMap((d, family) =>
  Array.from({ length: d.domainSize }, (_, index) => {
    const c = d.problemAt(index);
    if (c.prompt.layout !== "math") throw Error("math");
    return {
      family,
      index,
      id: c.prompt.figureId,
      type: d.id,
      title: d.title,
      parameters: c.parameters,
      text: c.prompt.text,
      instruction: c.prompt.instruction,
      answer: c.answer.text,
    };
  }),
);
const html = String.raw`<!doctype html><meta charset="utf-8"><title>Measurement geometry gallery</title>
<style>body{font:16px Arial;margin:24px;background:#eee}nav{position:sticky;top:0;background:white;padding:12px;z-index:2}button,select{font:inherit;padding:6px}main{display:flex;flex-wrap:wrap;gap:16px}article{width:270px;padding:12px;background:white;border:1px solid #aaa}article svg{width:216px;height:216px;display:block;margin:auto}p{margin:8px 0;font-size:14px;line-height:1.5}h2{font-size:16px}#audit{white-space:pre-wrap}</style>
<nav><select id="family"></select> <button id="run">Audit all SVGs</button><span id="status"></span></nav><pre id="audit"></pre><main></main>
<script>
let rows=[];const families=document.querySelector('#family');
const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
async function show(i){
 document.querySelector('main').innerHTML=''; const all=rows.filter(r=>r.family===i);
 const picks=[...new Set([0,1,Math.floor(all.length/4),Math.floor(all.length/2),Math.floor(all.length*3/4),all.length-1])];
 for(const idx of picks){const r=all[idx],el=document.createElement('article');el.innerHTML='<h2>'+r.type+' #'+r.index+'</h2><p>'+r.text+'</p><p>'+r.instruction+'</p>'+(r.id?await fetch('/svg/'+r.id).then(r=>r.text()):'')+'<p>Answer: '+r.answer+'</p>';document.querySelector('main').append(el);}
}
window.auditAll=async function(strokes=true){
 const failures=[],host=document.createElement('div');host.style.cssText='position:absolute;left:-1000px;top:0;visibility:hidden';document.body.append(host);
 let labels=0,shapes=0,minFontPx=Infinity;
 for(let i=0;i<rows.length;i+=50){
   const batch=rows.slice(i,i+50).filter(r=>r.id);host.innerHTML=(await Promise.all(batch.map(r=>fetch('/svg/'+r.id).then(r=>r.text())))).join('');
   [...host.querySelectorAll('svg')].forEach((s,j)=>{s.style.width='216px';s.style.height='216px';const id=batch[j].id,ls=[...s.querySelectorAll('text')],bs=ls.map(t=>t.getBBox());
     ls.forEach(t=>{const px=parseFloat(getComputedStyle(t).fontSize)*s.getBoundingClientRect().width/240;minFontPx=Math.min(minFontPx,px);if(px<17.99)failures.push({id,kind:'font-size',px});});
     ls.forEach((t,k)=>{const b=bs[k];labels++;if(b.x<1||b.y<1||b.x+b.width>239||b.y+b.height>239)failures.push({id,kind:'label-bounds',text:t.textContent,box:{x:b.x,y:b.y,w:b.width,h:b.height}});
       for(let l=k+1;l<bs.length;l++)if(overlap(b,bs[l]))failures.push({id,kind:'label-overlap',a:t.textContent,b:ls[l].textContent});});
     [...s.querySelectorAll('line,path,polygon,circle,ellipse')].forEach(t=>{shapes++;const b=t.getBBox();if(b.x<0||b.y<0||b.x+b.width>240||b.y+b.height>240)failures.push({id,kind:'shape-bounds',tag:t.tagName});
       if(strokes){const length=t.getTotalLength();bs.forEach((b,k)=>{for(let d=0;d<=length;d+=2){const p=t.getPointAtLength(d);if(p.x>b.x+2&&p.x<b.x+b.width-2&&p.y>b.y+2&&p.y<b.y+b.height-2){failures.push({id,kind:'label-stroke',text:ls[k].textContent,tag:t.tagName});break;}}});}
     });
   });
 }
 host.remove();const result={tasks:rows.length,figures:rows.filter(r=>r.id).length,families:families.length,labels,shapes,minFontPx,failures};document.querySelector('#audit').textContent=JSON.stringify(result,null,2);return result;
};
fetch('/data').then(r=>r.json()).then(async data=>{rows=data;[...new Map(rows.map(r=>[r.family,r])).values()].forEach(r=>{const o=document.createElement('option');o.value=r.family;o.textContent=r.family+' '+r.title;families.append(o)});const i=Number(new URLSearchParams(location.search).get('family')||0);families.value=i;await show(i);document.querySelector('#status').textContent=rows.length+' tasks / '+families.length+' families';});
families.onchange=()=>show(Number(families.value));document.querySelector('#run').onclick=()=>window.auditAll();
</script>`;
createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/data") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(rows));
  } else if (url.pathname.startsWith("/svg/")) {
    const id = url.pathname.slice(5);
    if (!Object.hasOwn(figures, id)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.end(figures[id]);
  } else {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  }
}).listen(port, "127.0.0.1", () =>
  console.log(
    `Geometry gallery http://127.0.0.1:${port} (${defs.length} families, ${rows.length} tasks)`,
  ),
);
