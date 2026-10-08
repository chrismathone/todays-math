import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const repo=process.cwd();
delete process.env.STUDIO_ENGINE_URL;delete process.env.VERCEL;delete process.env.VERCEL_ENV;
process.env.FIGURE_ENGINE_PATH=path.join(repo,'vendor','figure-engine');
process.env.PYTHONDONTWRITEBYTECODE='1';
const require=createRequire(path.join(repo,'package.json'));
const {renderFigureSpec}=require(path.join(repo,'src/lib/figure/renderFigureSpec.ts'));
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const strict=JSON.parse(fs.readFileSync(path.join(root,'checks/strict-render.json'),'utf8'));
const results=[];
for(let i=0;i<strict.results.length;i+=4){
 for(const row of await Promise.all(strict.results.slice(i,i+4).map(async j=>{
  const spec=fs.readFileSync(path.join(root,j.spec));assert.equal(sha(spec),j.specSha256);
  const result=await renderFigureSpec(JSON.parse(spec.toString('utf8')),{strict:true,typeset:true});
  assert.equal(result.ok,true,result.error);assert.equal(result.droppedDimensions?.length??0,0);
  assert.equal(sha(result.svg),j.svgSha256,'Render byte drift: '+j.svg);
  assert.equal(sha(fs.readFileSync(path.join(root,j.svg))),j.svgSha256);
  return {spec:j.spec,specSha256:j.specSha256,svg:j.svg,svgSha256:j.svgSha256,strict:true,local:true,byteIdenticalReproduction:true};
 }))){results.push(row);}
}
const output=JSON.stringify({method:'fresh Node process renderFigureSpec strict:true/typeset:true; compare exact bytes in memory; never overwrite SVG',independentVerification:false,modelOrPaidApiCalls:0,results},null,2)+'\n';
const dest=path.join(root,'checks/node-render-reproduction.json');
if(fs.existsSync(path.join(root,'author-freeze.json')))assert.equal(fs.readFileSync(dest,'utf8'),output,'Sealed reproduction record changed');
else fs.writeFileSync(dest,output);
console.log(`${results.length} strict SVGs reproduced byte-for-byte locally; no figure files written.`);
