import {describe,it,expect} from 'vitest';
import {loadPackagedOntologyBase,readPackagedOntologyArtifact} from '@/lib/math-ontology/runtime/base';
const BASE='sha256:b463e9161113eefbb96c845c05fe85774b6fa7eccab888d3936c623b77db6c3c';
describe('actual all-source immutable package',()=>{
 it('binds the complete actual source/proof release and bounded per-slice bytes',()=>{
   const {base,sourceManifest}=loadPackagedOntologyBase(BASE);
   expect(base.coverage.primaryFocus).toBe(107368);
   expect(sourceManifest.entities).toBe(51319);
   expect(base.partitions).toHaveLength(419);
   const first=base.partitions[0];
   const data=JSON.parse(readPackagedOntologyArtifact(base,first.artifact).toString('utf8'));
   expect(data.projectionHash).toBe(base.projectionHash);
   expect(data.proofs.length).toBe(first.proofs);
   expect(first.artifact.rawBytes).toBeLessThan(8*1024*1024);
 });
 it('rejects an unknown base and caller-authored artifact descriptors',()=>{
   expect(()=>loadPackagedOntologyBase('sha256:'+'a'.repeat(64))).toThrow();
   const {base}=loadPackagedOntologyBase(BASE);
   expect(()=>readPackagedOntologyArtifact(base,{...base.partitions[0].artifact,path:'file:///etc/passwd'})).toThrow('UNBOUND_PACKAGED_DESCRIPTOR');
   expect(()=>readPackagedOntologyArtifact(base,{...base.partitions[0].artifact,byteHash:'sha256:'+'b'.repeat(64)})).toThrow('UNBOUND_PACKAGED_DESCRIPTOR');
 });
});

import release from '../fixtures/ontology-packaged-release.json';
import {loadOntologyRuntime} from '@/lib/math-ontology/runtime/artifact';
import {mathOntologyGraphIdentitySchema} from '@/contracts/mathOntology.contract';
import {queryOntology} from '@/lib/math-ontology/query/closed';
const context={allowedScopes:['global'],contextHash:'actual-native-fixture-only',cursorSecret:'synthetic-local-test-only',deadlineMs:10000};
it('consumes actual full-source proof slices through N3, Core SHACL, witness checker and multi-hop SPARQL',async()=>{
 const runtime=await loadOntologyRuntime(release,mathOntologyGraphIdentitySchema.parse(release.identity));
 const {base}=loadPackagedOntologyBase(BASE);
 const index=JSON.parse(readPackagedOntologyArtifact(base,base.catalog).toString('utf8')) as {entries:{entity:string;namespace:string}[]};
 const assessment=index.entries.find(e=>e.namespace==='bank-assessment')!.entity;
 const first=await queryOntology(runtime,{kind:'neighbors',entityId:assessment,relation:'assessesDefinition',limit:10},context);
 expect(first.rows).toHaveLength(1);
 const definition=first.rows[0].o;
 const second=await queryOntology(runtime,{kind:'neighbors',entityId:definition,relation:'partOf',limit:10},context);
 const chapter=second.rows.find(r=>index.entries.some(e=>e.entity===r.o&&e.namespace==='curriculum-chapter'))!.o;
 const path=await queryOntology(runtime,{kind:'path',entityId:assessment,targetId:chapter,limit:20},context);
 expect(path.proofIds.length).toBeGreaterThanOrEqual(2);
 expect(path.rows).toHaveLength(1);
 expect(runtime.validation.focusNodeCount).toBe(107368);
},60000);
it('reports an unregistered native identity as unresolved, never a proved empty negative',async()=>{
 const runtime=await loadOntologyRuntime(release,mathOntologyGraphIdentitySchema.parse(release.identity));
 await expect(queryOntology(runtime,{kind:'neighbors',entityId:'urn:todaymath:math-source:entity:missing:global:unknown',limit:10},context)).rejects.toThrow('ONTOLOGY_ENTITY_UNRESOLVED');
});
import deltaRelease from '../fixtures/ontology-packaged-delta-release.json';
it('consumes the actual globally inferred approved-delta witness across base partitions',async()=>{
 const runtime=await loadOntologyRuntime(deltaRelease,mathOntologyGraphIdentitySchema.parse(deltaRelease.identity));
 const reviews=JSON.parse(deltaRelease.files.review).assertions as {id:string;subject:string;predicate:string;object:string}[];
 const delta=reviews.find(a=>a.id==='urn:todaymath:assertion:synthetic-cross-partition-delta')!;
 const result=await queryOntology(runtime,{kind:'neighbors',entityId:delta.subject,relation:'partOf',limit:20},context);
 expect(result.rows.length).toBeGreaterThan(1);
 const selected=await runtime.materialize!({kind:'neighbors',entityId:delta.subject,limit:20},context);
 const derived=selected.proofs().filter(p=>p.rule==='prp-trp'&&p.assertionIds.includes(delta.id));
 expect(derived.length).toBeGreaterThan(0);
 expect(derived.every(p=>p.assertionIds.length>1)).toBe(true);
},60000);
