const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{stripTypeScriptTypes}=require('node:module');
const folder=__dirname;const scope=JSON.parse(fs.readFileSync(path.join(folder,'scope-input-r2.json'),'utf8').replace(/^\uFEFF/,''));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=Object.fromEntries(scope.files.map(f=>{const b=fs.readFileSync(f.path);if(sha(b)!==f.sha256)throw Error('scope mismatch '+f.path);return[path.basename(f.path),b.toString('utf8')];}));
function run(source){let js=stripTypeScriptTypes(source,{mode:'transform'}).replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm,'');const names=[...js.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)].map(m=>m[1]);js=js.replace(/\bexport\s+/g,'');return new Function('insist','match',js+'\nreturn {'+names.join(',')+'};')((v,m)=>{if(!v)throw Error(m)},(s,r)=>{const m=r.exec(s);if(!m)throw Error('no match');return m;});}
const factory=run(sources['inverseRootTable.ts']);const f=factory.inverseRootTable;
const full=Array.from({length:45},(_,i)=>({ordinal:i,draft:f.generate(0,i)}));
fs.writeFileSync(path.join(folder,'own-printed-tasks.json'),JSON.stringify(full.map(r=>({ordinal:r.ordinal,content:r.draft.content})),null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(folder,'own-generated-drafts.json'),JSON.stringify({scopeHashes:scope.files,metadata:factory.inverseRootTableStudyMetadata,domain:f.paramDomain.enumerate(),drafts:full},null,2)+'\n',{flag:'wx'});
process.stdout.write('45 printed tasks recorded; answers not printed');
