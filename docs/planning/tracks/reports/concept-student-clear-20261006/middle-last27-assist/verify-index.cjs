const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const folder='docs/planning/tracks/reports/concept-student-clear-20261006/middle-last27-assist/';
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const indexPaths=cp.execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert.ok(indexPaths.length>0);assert.ok(indexPaths.every(p=>p.startsWith(folder)),'Only new handoff folder may be committed');
for(const file of manifest.files){
 const actual=fs.readFileSync(path.join(__dirname,file.path));
 const staged=cp.execFileSync('git',['show',':'+folder+file.path],{maxBuffer:16*1024*1024});
 assert.equal(actual.length,file.bytes,file.path);assert.equal(sha(actual),file.sha256,file.path);
 assert.equal(staged.length,file.bytes,`${file.path}: Git line-ending conversion changed bytes`);
 assert.equal(sha(staged),file.sha256,`${file.path}: index byte hash changed`);
}
assert.deepEqual(cp.execFileSync('git',['show',':'+folder+'manifest.json']),fs.readFileSync(path.join(__dirname,'manifest.json')));
console.log(JSON.stringify({stagedFiles:indexPaths.length,manifestFilesVerified:manifest.files.length,indexByteHashesMatch:true,onlyOwnedFolder:true}));
