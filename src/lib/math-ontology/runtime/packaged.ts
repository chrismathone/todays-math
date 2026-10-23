import {z} from 'zod';
import {DataFactory,Parser,Store} from 'n3';
import {mathOntologyAssertionSchema,mathOntologyProofSchema,MATH_ONTOLOGY_RELATIONS,MATH_ONTOLOGY_VOCAB as TM,type MathOntologyArtifact,type MathOntologyAssertion,type MathOntologyProof,type MathOntologyQuery} from '@/contracts/mathOntology.contract';
import type {MathOntologyRuntime} from './artifact';
import type {OntologyQueryContext} from '../query/closed';
import {cursorDecode} from '../query/closed';
import {loadPackagedOntologyBase,packagedSourceSchema,readPackagedOntologyArtifact,readOntologyAsset} from './base';
import {readSourcePartitionArtifact} from '../sources/partitions';
import {canonicalOntologyJson,freezeOntology} from '../compiler/canonical';
import {checkOntologyProofs} from '../proof/check';
import {validateOntologyCore} from '../validation/core';
import sourceKinds from '../../../../ontology/model/source-kinds.json';
const {namedNode,literal,quad}=DataFactory;
const RDF='http://www.w3.org/1999/02/22-rdf-syntax-ns#',RDFS='http://www.w3.org/2000/01/rdf-schema#';
const catalogSchema=z.strictObject({format:z.literal('tm-source-search-index-1'),projectionHash:z.string(),entries:z.array(z.strictObject({entity:z.string(),stableIri:z.string(),namespace:z.string(),nativeId:z.string(),kind:z.enum(Object.keys(sourceKinds) as [keyof typeof sourceKinds,...(keyof typeof sourceKinds)[]]),scope:z.literal('global'),label:z.string(),partition:z.string()}))});
const sliceSchema=z.strictObject({format:z.literal('tm-proof-slice-1'),projectionHash:z.string(),key:z.string(),primaryProofIds:z.array(z.string()),proofs:z.array(mathOntologyProofSchema),assertions:z.array(mathOntologyAssertionSchema),closureTriples:z.array(z.tuple([z.string(),z.string(),z.string()])),sourcePartitionKeys:z.array(z.string())});
/** Hash verification is cheap and complete; RDF stores are per request/version and bounded. */
export function loadPackagedOntologyRuntime(artifact:MathOntologyArtifact):MathOntologyRuntime{
 const source=packagedSourceSchema.parse(JSON.parse(artifact.files.source));
 const registryDescriptor=z.strictObject({format:z.literal('tm-packaged-registry-1'),baseHash:z.string()}).parse(JSON.parse(artifact.files.registry));
 if(registryDescriptor.baseHash!==source.baseHash)throw new Error('UNBOUND_PACKAGED_RELEASE');
 const loaded=loadPackagedOntologyBase(source.baseHash),{base,sourceManifest}=loaded;
 if(base.projectionHash!==source.projectionHash)throw new Error('PACKAGED_PROJECTION_MISMATCH');
 const review=z.strictObject({format:z.literal('tm-packaged-review-1'),authorityDecisionId:z.string(),baseHash:z.string(),assertions:z.array(mathOntologyAssertionSchema)}).parse(JSON.parse(artifact.files.review));
 if(review.authorityDecisionId!==source.authorityDecisionId||review.baseHash!==source.baseHash)throw new Error('UNBOUND_PACKAGED_APPROVAL');
 const extraProofs=z.array(mathOntologyProofSchema).parse(JSON.parse(artifact.files.proof));
 const extraAssertions=review.assertions;
 const shapes=JSON.parse(artifact.files.shapes).runtime as string;
 const releasedCoverage=JSON.parse(artifact.files.coverage);
 const coverage=freezeOntology({scope:'global',registryTriples:sourceManifest.quadCount,engineInferredTriples:releasedCoverage.engineInferred,witnessedInferredTriples:releasedCoverage.witnessedInferred,untracedInferredTriples:releasedCoverage.untracedInferred});
 const sealedValidation=freezeOntology({engine:'pyshacl@0.40.1:offline-full-source',conforms:true,incomplete:false,report:canonicalOntologyJson(base.localValidation),focusNodeCount:base.coverage.primaryFocus,results:[]});
 // Per-version cache contains JSON proof packets, never a mutable current store.
 const packetCache=new Map<string,z.infer<typeof sliceSchema>>();
 let indexed: {index:z.infer<typeof catalogSchema>;byEntity:Map<string,z.infer<typeof catalogSchema>["entries"][number]>;byStable:Map<string,string>}|null=null;
 function getIndex(){
  if(!indexed){
   const index=catalogSchema.parse(JSON.parse(readPackagedOntologyArtifact(base,base.catalog).toString('utf8')));
   if(index.projectionHash!==base.projectionHash||index.entries.length!==base.coverage.entities)throw new Error('PACKAGED_CATALOG_BINDING');
   indexed={index,byEntity:new Map(index.entries.map(e=>[e.entity,e])),byStable:new Map(index.entries.map(e=>[e.stableIri,e.entity]))};
  }return indexed;
 }
 // Source-only reverse lookup seeds forward queries; it is not an inverse OWL
 // assertion or a citation. Actual proof/SHACL validation still happens per seed.
 let assessmentIndex:ReadonlyMap<string,readonly string[]>|null=null;
 function assessmentSubjects(definition:string,context:OntologyQueryContext):readonly string[]{
  if(!context.allowedScopes.includes('global'))throw new Error('SCOPE_DENIED');
  const {byEntity,byStable}=getIndex(),target=byStable.get(definition)??definition;
  if(!byEntity.has(target))throw new Error('ONTOLOGY_ENTITY_UNRESOLVED');
  if(!assessmentIndex){
   const signature=z.strictObject({format:z.literal('tm-global-signature-1'),projectionHash:z.string(),premises:z.array(z.tuple([z.string(),z.string(),z.string(),z.string()]))}).parse(JSON.parse(readPackagedOntologyArtifact(base,base.signature).toString('utf8')));
   if(signature.projectionHash!==base.projectionHash)throw new Error('PACKAGED_SIGNATURE_BINDING');
   const index=new Map<string,string[]>();
   for(const [s,p,o] of signature.premises)if(p===TM+'assessesDefinition'){const values=index.get(o)??[];values.push(s);index.set(o,values);}
   assessmentIndex=new Map([...index].map(([id,values])=>[id,Object.freeze([...new Set(values)].sort())]));
  }
  const values=assessmentIndex.get(target)??[];
  if(values.length>8)throw new Error('MATERIALIZATION_ASSESSMENT_SEED_BUDGET');
  return Object.freeze([...values]);
 }
 const refuse=():never=>{throw new Error('PACKAGED_RUNTIME_REQUIRES_BOUNDED_MATERIALIZATION');};
 const runtime:MathOntologyRuntime={identity:artifact.identity,coverage,validation:sealedValidation,shapes,datasets:refuse,proofs:refuse,assessmentSubjects,resolveEntity:(iri)=>getIndex().byStable.get(iri)??iri,
 async materialize(query:MathOntologyQuery,context:OntologyQueryContext):Promise<MathOntologyRuntime>{
  if(!context.allowedScopes.includes('global'))throw new Error('SCOPE_DENIED');
  const {index,byEntity,byStable}=getIndex();
  const started=performance.now();let rawBytes=0,packetLoads=0;
  const proofs=new Map<string,MathOntologyProof>();const assertions=new Map<string,MathOntologyAssertion>();const entities=new Set<string>();
  const normal=(id:string)=>byStable.get(id)??id;
  if(query.kind!=='catalog'&&[query.entityId,query.targetId].filter(Boolean).some(id=>!byEntity.has(normal(id!))))throw new Error('ONTOLOGY_ENTITY_UNRESOLVED');
  function loadPacket(key:string){
   const descriptor=base.partitions.find(p=>p.key===key);if(!descriptor)throw new Error('MISSING_PROOF_PARTITION');
   let packet=packetCache.get(key);
   if(!packet){
    packetLoads++;if(packetLoads>12)throw new Error('MATERIALIZATION_PARTITION_BUDGET');
    const bytes=readPackagedOntologyArtifact(base,descriptor.artifact);rawBytes+=bytes.length;
    if(rawBytes>64*1024*1024)throw new Error('MATERIALIZATION_BYTE_BUDGET');
    packet=sliceSchema.parse(JSON.parse(bytes.toString('utf8')));
    if(packet.projectionHash!==base.projectionHash||packet.key!==key||packet.proofs.length!==descriptor.proofs)throw new Error('PACKAGED_PROOF_BINDING');
    packetCache.set(key,packet);while(packetCache.size>4)packetCache.delete(packetCache.keys().next().value!);
   }
   return packet;
  }
  function include(id:string){
   const entry=byEntity.get(normal(id));if(!entry)throw new Error('ONTOLOGY_ENTITY_UNRESOLVED');
   entities.add(entry.entity);const packet=loadPacket(entry.partition);
   const byId=new Map(packet.proofs.map(p=>[p.id,p]));
   const templates=new Map(packet.assertions.map(a=>[a.id,a]));
   const queue=packet.proofs.filter(p=>p.conclusion[0]===entry.entity).map(p=>p.id);
   for(const proof of extraProofs)if(proof.conclusion[0]===entry.entity)queue.push(proof.id);
   const extraById=new Map(extraProofs.map(p=>[p.id,p]));
   while(queue.length){
    const id=queue.pop()!;if(proofs.has(id))continue;
    const proof=byId.get(id)??extraById.get(id);if(!proof)throw new Error('MISSING_PACKAGED_PREMISE');
    if(!context.allowedScopes.includes(proof.scope))throw new Error('PROOF_SCOPE_DENIED');
    proofs.set(id,proof);queue.push(...proof.premises);
    for(const assertionId of proof.assertionIds){
     const manual=extraAssertions.find(a=>a.id===assertionId),template=templates.get(assertionId);
     if(manual)assertions.set(assertionId,manual);
     else if(template){
      if(template.origin!=='source-projection'||template.review!=='unreviewed'||template.publication!=='unpublished')throw new Error('INVALID_NATIVE_ASSERTION_TEMPLATE');
      assertions.set(assertionId,mathOntologyAssertionSchema.parse({...template,review:'approved',publication:'published',approvalId:source.authorityDecisionId}));
     }else throw new Error('PACKAGED_ASSERTION_TEMPLATE_MISSING');
    }
   }
  }
  let catalogEntries=index.entries;
  if(query.kind==='catalog'){
   const offset=query.cursor?cursorDecode(query.cursor,context.cursorSecret).offset:0;
   if(typeof offset!=='number'||!Number.isSafeInteger(offset)||offset<0)throw new Error('INVALID_CURSOR');
   const needle=query.q?.toLowerCase();
   catalogEntries=index.entries.filter(e=>(!query.namespace||e.namespace===query.namespace)&&(!needle||e.label.toLowerCase().includes(needle)));
   // Only visible rows require metadata; the bounded global search index contains
   // registered public labels/identities, never private counts or source text.
   for(const e of catalogEntries.slice(offset,offset+query.limit+1))entities.add(e.entity);
  }else if(query.entityId){
   const seeds=query.kind==='path'&&query.cursor?cursorDecode(query.cursor,context.cursorSecret).frontier:undefined;
   const queue=Array.isArray(seeds)?seeds.map(x=>normal(String(x.id))):[normal(query.entityId)];
   const seen=new Set<string>();let found=false;
   while(queue.length&&seen.size<500){
    if(performance.now()-started>8000)throw new Error('MATERIALIZATION_TIME_BUDGET');
    const id=queue.shift()!;if(seen.has(id))continue;seen.add(id);include(id);
    if(query.kind!=='path')break;
    for(const p of proofs.values())if(p.conclusion[0]===id&&MATH_ONTOLOGY_RELATIONS.some(r=>p.conclusion[1]===TM+r)&&(!query.relation||p.conclusion[1]===TM+query.relation)){
      if(p.conclusion[2]===normal(query.targetId??'')){entities.add(p.conclusion[2]);found=true;}
      else if(!seen.has(p.conclusion[2]))queue.push(p.conclusion[2]);
    }
    if(found)break;
   }
   // Materialization cannot silently omit a frontier and claim a negative result.
   if(queue.length&&!found)throw new Error('MATERIALIZATION_FRONTIER_BUDGET');
   if(query.targetId)entities.add(normal(query.targetId));
  }
  const needed=new Set(entities);
  const sourceKeys=new Set<string>();
  for(const a of assertions.values()){
   needed.add(a.sourceRevision);needed.add(a.subject);needed.add(a.object);
   const subject=byEntity.get(a.subject);if(subject)sourceKeys.add(subject.partition);
  }
  for(const id of entities){const entry=byEntity.get(id);if(entry)sourceKeys.add(entry.partition);}
  if(sourceKeys.size>32)throw new Error('MATERIALIZATION_SOURCE_PARTITION_BUDGET');
  const sourceData=new Store();let sourceBytes=0;
  for(const key of [...sourceKeys].sort()){
   const descriptor=sourceManifest.partitions.find(p=>p.key===key);if(!descriptor)throw new Error('MISSING_SOURCE_PARTITION');
   const bytes=readSourcePartitionArtifact(readOntologyAsset,sourceManifest,descriptor.nquads);sourceBytes+=bytes.length;
   if(sourceBytes>128*1024*1024)throw new Error('MATERIALIZATION_SOURCE_BYTE_BUDGET');
   // The actual RDF parser consumes every loaded quad. Retain only the exact
   // dependency closure needed by this request before making a store available.
   for(const q of new Parser({format:'N-Quads'}).parse(bytes.toString('utf8')))if(needed.has(q.subject.value))sourceData.addQuad(quad(q.subject,q.predicate,q.object));
  }
  for(const id of needed){const e=byEntity.get(id);if(e)sourceData.addQuad(namedNode(id),namedNode(RDF+'type'),namedNode(sourceKinds[e.kind].classIri));}
  // Fresh RDF/SHACL and independent proof checking apply to actual premises.
  const validation=await validateOntologyCore(sourceData,shapes);
  if(!validation.conforms||validation.incomplete)throw new Error('PACKAGED_SOURCE_CORE_VIOLATION');
  const asserted=new Store(),closure=new Store();
  for(const a of assertions.values()){
   const sourcePredicate=a.sourceDigestKind==='authorized-projection'?'sourceProjectionHash':'sourceByteHash';
   if(!sourceData.getObjects(namedNode(a.sourceRevision),namedNode(TM+sourcePredicate),null).some(v=>v.value===a.sourceDigest))throw new Error('PACKAGED_SOURCE_REVISION_MISMATCH');
   asserted.addQuad(namedNode(a.subject),namedNode(a.predicate),namedNode(a.object));
   for(const [p,o] of [[RDF+'type',TM+'Assertion'],[RDF+'subject',a.subject],[RDF+'predicate',a.predicate],[RDF+'object',a.object],[TM+'sourceRevision',a.sourceRevision],[TM+'approval',a.approvalId!]])asserted.addQuad(namedNode(a.id),namedNode(p),namedNode(o));
   for(const [p,o] of [['sourceDigest',a.sourceDigest],['scope',a.scope],['review',a.review]])asserted.addQuad(namedNode(a.id),namedNode(TM+p),literal(o));
  }
  const assertionValidation=await validateOntologyCore(new Store([...sourceData,...asserted]),shapes);
  if(!assertionValidation.conforms)throw new Error('PACKAGED_ASSERTION_CORE_VIOLATION');
  for(const p of proofs.values())closure.addQuad(namedNode(p.conclusion[0]),namedNode(p.conclusion[1]),namedNode(p.conclusion[2]));
  const model=new Store(new Parser({format:'text/turtle'}).parse(artifact.files.ontology));
  const checked=checkOntologyProofs([...proofs.values()],[...assertions.values()],model,closure);
  const registry=query.kind==='catalog'?new Store():new Store(sourceData);
  if(query.kind==='catalog')for(const e of catalogEntries){
   registry.addQuad(namedNode(e.entity),namedNode(RDF+'type'),namedNode(TM+'SourceEntity'));
   for(const [p,o] of [[TM+'nativeNamespace',e.namespace],[TM+'sourceScope',e.scope],[RDFS+'label',e.label]])registry.addQuad(namedNode(e.entity),namedNode(p),literal(o));
  }
  return Object.freeze({identity:artifact.identity,coverage,validation:freezeOntology(validation),shapes,datasets:()=>({registry:new Store(registry),asserted:new Store(asserted),closure:new Store(closure)}),proofs:()=>freezeOntology(structuredClone(checked))});
 }};
 return Object.freeze(runtime);
}
