import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
if(fs.existsSync(path.join(root,'author-freeze.json')))throw new Error('Sealed packet: read-only verify instead.');
const require=createRequire(path.join(process.cwd(),'package.json'));
const {registeredTypes}=require(path.join(process.cwd(),'src/lib/middle/generate.ts'));
// Read only the pure registry and seeds: no problem handlers, model or DB.
const entries=registeredTypes().filter(e=>e.grade==='중3').map(({key,grade,unitSection,rpmBook,rpmMinor,rpmType,rpmTitle})=>({key,grade,unitSection,rpmBook,rpmMinor,rpmType,rpmTitle}));
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'evidence/reference-snapshots/registry-read-20261008.json'),'utf8'));
const comparisons=JSON.parse(fs.readFileSync(path.join(root,'evidence/taxonomy-comparisons.json'),'utf8')).comparisons;
const relevant=new Set(comparisons.flatMap(c=>c.comparedNotAssigned.map(k=>'3-2|'+k)));
for(const key of relevant)assert.deepEqual(entries.find(e=>e.key===key),snapshot.entries.find(e=>e.key===key),'Selected entry changed: '+key);
const {CURRICULUM_UNITS}=require(path.join(process.cwd(),'prisma/seed-data/units.ts'));
const units=[...new Map(comparisons.map(c=>[c.unit.id,c.unit])).values()];
for(const u of units){const seed=CURRICULUM_UNITS.find(s=>s.grade===u.grade&&s.section===u.section);assert(seed);assert.equal(seed.orderIndex,u.orderIndex);assert.equal(seed.chapter,u.chapter);}
const bank=JSON.parse(fs.readFileSync(path.join(root,'evidence/reference-snapshots/bank-read-fresh-r2-20261008.json'),'utf8'));
fs.writeFileSync(path.join(root,'evidence/current-repository-registry.json'),JSON.stringify({method:'pure registeredTypes() and CURRICULUM_UNITS; no handlers, DB, model/API',repositoryCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),bankCapturedAt:bank.capturedAt,notCurrentDbAssertion:true,registrySnapshotCapturedAt:snapshot.capturedAt,selectedEntriesMatch:true,middle3EntryCount:entries.length,primaryUnitSeedMatches:units,entries:entries.filter(e=>relevant.has(e.key)),assignmentsCreated:0},null,2)+'\n');
console.log(`${relevant.size} exact registry entries match snapshot; ${units.length} exact seed/Unit rows; families stay held.`);
