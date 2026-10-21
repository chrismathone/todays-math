// Prepared runner ONLY. Not executed during Python/static proposal scope.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const P='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008/grid-measure-support-candidate-20261021-r1',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const {measureGridFromGray}=require('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/figure/gridMeasure.ts');
const manifest=JSON.parse(fs.readFileSync(path.join(P,'own-fixture-manifest.json'),'utf8'));
const decode=v=>v==='NaN'?NaN:v==='Infinity'?Infinity:v;
const rows=[];
for(const c of manifest.cases){
 let data;
 if(c.grayFile)data=new Uint8Array(fs.readFileSync(path.join(P,c.grayFile)));
 else switch(c.grayMode){
  case 'short':data=new Uint8Array(9999);break;
  case 'long':data=new Uint8Array(10001);break;
  case 'sparse':data=new Array(10000);break;
  case 'oversize-sparse':data=new Array(2000001);break;
  case 'fake-arraylike':data={length:10000,0:255};break;
  case 'undefined':data=undefined;break;
  case 'string':data='255';break;
  case 'override':data=new Array(10000).fill(255);data[0]=decode(c.value);break;
  default:data=[];
 }
 const before=c.grayFile?hash(data):null;
 const result=measureGridFromGray(data,decode(c.width),decode(c.height));
 const again=measureGridFromGray(data,decode(c.width),decode(c.height));
 const expected=c.expected==='null'?result===null:result?.kind==='heuristic-only'&&result.requiresReview===true&&result.x.count===8&&result.y.count===8;
 rows.push({id:c.id,pass:expected&&JSON.stringify(result)===JSON.stringify(again)&&(!before||before===hash(data)),result,inputSHA256:before});
}
fs.writeFileSync(path.join(__dirname,'grid-candidate-runtime-results.json'),JSON.stringify({candidateSHA256:hash(fs.readFileSync(require.resolve('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/figure/gridMeasure.ts'))),rows,passed:rows.filter(x=>x.pass).length,total:rows.length},null,2));
console.log(JSON.stringify({passed:rows.filter(x=>x.pass).length,total:rows.length}));
