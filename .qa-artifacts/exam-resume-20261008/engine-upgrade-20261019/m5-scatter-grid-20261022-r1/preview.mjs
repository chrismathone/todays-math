import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {Resvg}=require('@resvg/resvg-js');
const folder=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const data=JSON.parse(fs.readFileSync(path.join(folder,'actual-current.json'),'utf8'));
const font='C:/Windows/Fonts/batang.ttc';
if(!fs.existsSync(font))throw Error('Existing Batang font required for this technical preview');
const rows=[];
for(const row of data.rows){
 const svg=fs.readFileSync(path.join(folder,row.file),'utf8');
 const png=new Resvg(svg,{fitTo:{mode:'width',value:720},background:'white',font:{fontFiles:[font],loadSystemFonts:false,defaultFontFamily:'Batang'}}).render().asPng();
 const file=row.file.replace('.svg','.png');fs.writeFileSync(path.join(folder,file),png,{flag:'wx'});
 rows.push({id:row.id,file,svgSHA256:crypto.createHash('sha256').update(svg).digest('hex'),pngSHA256:crypto.createHash('sha256').update(png).digest('hex')});
}
fs.writeFileSync(path.join(folder,'preview-manifest.json'),JSON.stringify({utc:new Date().toISOString(),actualPublicSVG:true,renderer:'resvg',font,technicalOnly:true,pixelsNotMathOracle:true,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({previews:rows.length}));
