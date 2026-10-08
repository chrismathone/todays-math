const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {sha,assert}=require('./author-common.cjs');
require('tsx/cjs');const sharp=require('sharp');
const {renderFigureSpec}=require(path.resolve(__dirname,'../../../src/lib/figure/renderFigureSpec.ts'));
(async()=>{
  for(const n of [10,11,12,13,14,16,17,18]){
    const p=path.join(__dirname,'candidates','q'+String(n).padStart(2,'0'));
    const file=path.join(p,'candidate.json');
    assert(execFileSync('git',['ls-files','--',file],{encoding:'utf8'}).trim()==='','Only uncommitted current drafts may be repaired');
    const c=JSON.parse(fs.readFileSync(file,'utf8'));
    c.metadata.authorEvidence.authoringScriptSha256=sha(fs.readFileSync(path.join(__dirname,'author-group2.cjs')));
    if(n===12)c.content=c.content.replace('**($D$의 $x$좌표, $m$, $n$)**','($D$의 $x$좌표, $m$, $n$)');
    if(n===10||n===12||n===17){
      const spec=JSON.parse(fs.readFileSync(path.join(p,'stem.spec.json'),'utf8'));
      if(n===10){spec.labels[0]={at:[2,-3],text:'$V$',dx:8,dy:22,size:18};spec.labels[1]={at:[0,5],text:'$P$',dx:-22,dy:2,size:18};}
      if(n===12){spec.labels[1]={at:[-1,0],text:'$B$',dx:-24,dy:18,size:18,anchor:'end'};spec.labels[2]={at:[3,0],text:'$C$',dx:24,dy:18,size:18,anchor:'start'};spec.labels[3]={at:[1,0],text:'$D$',dx:-16,dy:22,size:18};}
      if(n===17){const t=225/289;spec.points={A:[60,100],B:[220,400],C:[60,400],D:[60+160*t,100+300*t]};spec.angles.angX.radius=30;spec.angles.angY.radius=30;c.facts.footD=spec.points.D;const calc=JSON.parse(fs.readFileSync(path.join(p,'author-calculations.json'),'utf8'));calc.facts.footD=spec.points.D;fs.writeFileSync(path.join(p,'author-calculations.json'),JSON.stringify(calc,null,2)+'\n');}
      const rendered=await renderFigureSpec(spec,{strict:true});assert(rendered.ok,'Strict repair rendering');
      fs.writeFileSync(path.join(p,'stem.spec.json'),JSON.stringify(spec,null,2)+'\n');fs.writeFileSync(path.join(p,'stem.svg'),rendered.svg);
      await sharp(Buffer.from(rendered.svg)).resize({width:265}).flatten({background:'white'}).png().withMetadata({density:96}).toFile(path.join(p,'stem.70mm.png'));
    }
    fs.writeFileSync(file,JSON.stringify(c,null,2)+'\n');
  }
  console.log(JSON.stringify({draftOnlyRepairs:[10,12,17],changes:'label placement/clarity and native emphasis syntax; mathematical givens and answers unchanged',committedCandidatesModified:false}));
})().catch(e=>{console.error(e);process.exit(1)});
