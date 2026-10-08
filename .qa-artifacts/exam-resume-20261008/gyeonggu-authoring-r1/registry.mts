import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));const require=createRequire(path.join(process.cwd(),'package.json'));
const {registeredTypes}=require(path.join(process.cwd(),'src/lib/middle/generate.ts'));
// Pure repository registry; do not call any problem handler or DB client.
const entries=registeredTypes().filter(e=>e.grade==='중3').map(({key,grade,unitSection,rpmBook,rpmMinor,rpmType,rpmTitle})=>({key,grade,unitSection,rpmBook,rpmMinor,rpmType,rpmTitle}));
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'evidence/reference-snapshots/registry-read-20261008.json'),'utf8'));
const comparisons=JSON.parse(fs.readFileSync(path.join(root,'evidence/taxonomy-comparisons.json'),'utf8')).comparisons;
const relevant=new Set(comparisons.flatMap(c=>c.nearestComparedNotAssigned.map(k=>'3-2|'+k)));
for(const key of relevant){assert.deepEqual(entries.find(e=>e.key===key),snapshot.entries.find(e=>e.key===key),'Selected registry entry differs: '+key);}
const {CURRICULUM_UNITS}=require(path.join(process.cwd(),'prisma/seed-data/units.ts'));
const units=[...new Map(comparisons.map(c=>[c.unit.id,c.unit])).values()];
for(const u of units){const seed=CURRICULUM_UNITS.find(s=>s.grade===u.grade&&s.section===u.section);assert(seed,'Missing exact unit seed');assert.equal(seed.orderIndex,u.orderIndex);assert.equal(seed.chapter,u.chapter);}
fs.writeFileSync(path.join(root,'evidence/current-repository-registry.json'),JSON.stringify({method:'pure registeredTypes() and CURRICULUM_UNITS; handlers not invoked, no DB/model/API',repositoryCommit:'eed3c53835c4923dc5807ffe61629700206ec41c',snapshotCapturedAt:snapshot.capturedAt,selectedEntriesMatch:true,middle3EntryCount:entries.length,primaryUnitSeedMatches:units,entries:entries.filter(e=>relevant.has(e.key))},null,2)+'\n');
console.log(`${relevant.size} relevant registry keys exact-match snapshot; ${entries.length} current repository middle3 entries; ${units.length} exact unit seed matches; no handlers/DB.`);
