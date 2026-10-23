import {DataFactory,Parser,Store} from 'n3';
import {mathOntologyCompileInputSchema,mathOntologyAssertionSchema,mathOntologyProofSchema,type MathOntologyCompileInput} from '@/contracts/mathOntology.contract';
import {canonicalOntologyJson,ontologyDigest} from '../compiler/canonical';
import {verifyOntologyArtifact,loadOntologyRuntime} from './artifact';
import {loadPackagedOntologyBase,packagedSourceSchema,readPackagedOntologyArtifact} from './base';
import {checkOntologyProofs} from '../proof/check';
import {z} from 'zod';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const fail=():never=>{throw new Error('COMPILED_INPUT_BINDING_MISMATCH');};
/** Mandatory activation verifier: self-consistent output is not the expected job result. */
export async function verifyOntologyCompiledArtifactForInput(raw:unknown,expected:MathOntologyCompileInput){
 const input=mathOntologyCompileInputSchema.parse(expected);
 const identity=z.object({identity:z.unknown()}).parse(raw).identity;
 const artifact=verifyOntologyArtifact(raw,identity as Parameters<typeof verifyOntologyArtifact>[1]);
 const engine=JSON.parse(artifact.files.engine);
 const implementation=readFileSync(resolve(process.cwd(),'scripts/ontology/compiler/compiler.py'),'utf8');
 const isPackaged=artifact.files.registry.startsWith('{');
 const expectedImplementation=ontologyDigest((isPackaged?readFileSync(resolve(process.cwd(),'scripts/ontology/compiler/packaged.py'),'utf8'):'')+implementation);
 if(engine.implementationHash!==expectedImplementation||engine.lock!==readFileSync(resolve(process.cwd(),'scripts/ontology/compiler/requirements.lock'),'utf8'))fail();
 if(engine.compileInputHash!==ontologyDigest(canonicalOntologyJson(input))||artifact.files.source!==input.sourceManifest)fail();
 const source=JSON.parse(input.sourceManifest);
 if(source?.format!=='tm-packaged-source-1'){
  if(artifact.files.registry!==input.registryNquads||canonicalOntologyJson(JSON.parse(artifact.files.review))!==canonicalOntologyJson([...input.assertions].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)))fail();
  await loadOntologyRuntime(artifact,artifact.identity);return artifact;
 }
 const descriptor=packagedSourceSchema.parse(source),{base}=loadPackagedOntologyBase(descriptor.baseHash);
 const review=z.strictObject({format:z.literal('tm-packaged-review-1'),authorityDecisionId:z.string(),baseHash:z.string(),assertions:z.array(mathOntologyAssertionSchema)}).parse(JSON.parse(artifact.files.review));
 if(review.authorityDecisionId!==descriptor.authorityDecisionId||review.baseHash!==descriptor.baseHash||base.projectionHash!==descriptor.projectionHash)fail();
 const wanted=new Map(input.assertions.map(a=>[a.id,a])),received=new Map(review.assertions.map(a=>[a.id,a]));
 if(wanted.size!==input.assertions.length||received.size!==review.assertions.length)fail();
 for(const [id,a] of wanted){
  if(id.startsWith('urn:todaymath:assertion:source:')||id.startsWith('urn:todaymath:assertion:source-type:'))fail();
  const actual=received.get(id);if(!actual||canonicalOntologyJson(actual)!==canonicalOntologyJson(a))fail();
 }
 const packetCache=new Map<string,{assertions:unknown[];proofs:unknown[]}>();
 function packet(subject:string){
  const match=/^urn:todaymath:math-source:entity:([a-z0-9-]+):global:.+:version:[a-f0-9]{64}$/.exec(subject);if(!match)return fail();
  const stable=subject.replace(/:version:[a-f0-9]{64}$/,''),key=match[1]+'/'+ontologyDigest(stable).slice(7,8);
  let value=packetCache.get(key);
  if(!value){
   if(packetCache.size>=32)throw new Error('COMPILED_PROOF_PARTITION_BUDGET');
   const p=base.partitions.find(p=>p.key===key);if(!p)return fail();
   value=JSON.parse(readPackagedOntologyArtifact(base,p.artifact).toString('utf8'));packetCache.set(key,value!);
  }return value!;
 }
 for(const [id,a] of received){
  if(wanted.has(id))continue;
  const original=packet(a.subject).assertions.map(a=>mathOntologyAssertionSchema.parse(a)).find(t=>t.id===id);
  if(!original||original.origin!=='source-projection'||original.review!=='unreviewed'||original.publication!=='unpublished'||canonicalOntologyJson({...original,review:'approved',publication:'published',approvalId:descriptor.authorityDecisionId})!==canonicalOntologyJson(a))fail();
 }
 const proofs=z.array(mathOntologyProofSchema).max(20000).parse(JSON.parse(artifact.files.proof));
 const closure=new Store();for(const proof of proofs)closure.addQuad(...proof.conclusion.map(DataFactory.namedNode) as [ReturnType<typeof DataFactory.namedNode>,ReturnType<typeof DataFactory.namedNode>,ReturnType<typeof DataFactory.namedNode>]);
 const model=new Store(new Parser({format:'text/turtle'}).parse(artifact.files.ontology));
 checkOntologyProofs(proofs,review.assertions,model,closure);
 for(const a of wanted.values()){
  const exact=(p:{conclusion:string[]})=>canonicalOntologyJson(p.conclusion)===canonicalOntologyJson([a.subject,a.predicate,a.object]);
  if(!proofs.some(exact)&&!packet(a.subject).proofs.map(p=>mathOntologyProofSchema.parse(p)).some(exact))fail();
 }
 const reports=JSON.parse(artifact.files.report);
 if(input.assertions.length&&(!reports.delta||reports.delta.deltaAssertions!==input.assertions.length||reports.delta.raw?.conforms!==true||reports.delta.closure?.conforms!==true||reports.delta.globalRaw?.conforms!==true||reports.delta.globalClosure?.conforms!==true||reports.delta.globalClosureHash!==JSON.parse(artifact.files.closure).afterDeltaClosureHash))fail();
 if(!input.assertions.length&&(proofs.length||review.assertions.length||reports.delta))fail();
 // No delta DAG is deferred until some later reader happens to query it.
 const runtime=await loadOntologyRuntime(artifact,artifact.identity);
 for(const a of input.assertions){
  if(runtime.materialize)await runtime.materialize({kind:'neighbors',entityId:a.subject,targetId:a.object,limit:20},{allowedScopes:[input.scope,'global'],contextHash:'compiled-input-verification',cursorSecret:'compiler-local-no-continuation'});
 }
 return artifact;
}
