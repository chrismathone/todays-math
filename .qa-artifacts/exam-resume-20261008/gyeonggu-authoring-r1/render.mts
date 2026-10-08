import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const repo=process.cwd();
if(fs.existsSync(path.join(root,'author-freeze.json')))throw new Error('Frozen author packet: create a new revision instead of rendering over it.');
const require=createRequire(path.join(repo,'package.json'));
// Guarantee the existing engine stays local even if parent environment has a URL.
delete process.env.STUDIO_ENGINE_URL;
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;
process.env.FIGURE_ENGINE_PATH=path.join(repo,'vendor','figure-engine');
const {renderFigureSpec}=require(path.join(repo,'src/lib/figure/renderFigureSpec.ts'));
const jobs=fs.readdirSync(path.join(root,'candidates')).flatMap(q=>fs.readdirSync(path.join(root,'candidates',q)).filter(f=>f.endsWith('.spec.json')).map(f=>path.join(root,'candidates',q,f)));
const rows=[];
for(let i=0;i<jobs.length;i+=4){
  for(const entry of await Promise.all(jobs.slice(i,i+4).map(async file=>{
    const result=await renderFigureSpec(JSON.parse(fs.readFileSync(file,'utf8')),{strict:true,typeset:true});
    if(!result.ok) return {spec:path.relative(root,file),ok:false,error:result.error};
    if(result.droppedDimensions?.length) throw new Error('Strict mode dropped dimensions');
    const svg=file.replace('.spec.json','.svg');fs.writeFileSync(svg,result.svg,'utf8');
    return {spec:path.relative(root,file).replaceAll('\\','/'),svg:path.relative(root,svg).replaceAll('\\','/'),specSha256:sha(fs.readFileSync(file)),svgSha256:sha(result.svg),ok:true,strict:true,typeset:true,local:true,droppedDimensions:[],bytes:Buffer.byteLength(result.svg)};
  }))){rows.push(entry);if(!entry.ok)console.log(JSON.stringify(entry));}
}
fs.mkdirSync(path.join(root,'checks'),{recursive:true});
fs.writeFileSync(path.join(root,'checks','strict-render.json'),JSON.stringify({method:'existing renderFigureSpec strict:true typeset:true, STUDIO_ENGINE_URL/VERCEL variables removed',independentVerification:false,results:rows},null,2)+'\n');
console.log(`${rows.filter(r=>r.ok).length}/${rows.length} strict local renders`);
if(rows.some(r=>!r.ok))process.exitCode=1;
