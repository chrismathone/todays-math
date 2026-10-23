import {describe,it,expect} from 'vitest';
import release from '../fixtures/ontology-packaged-release.json';
import delta from '../fixtures/ontology-packaged-delta-release.json';
import {verifyOntologyCompiledArtifactForInput} from '@/lib/math-ontology/runtime/compiled';
import {mathOntologyCompileInputSchema} from '@/contracts/mathOntology.contract';
const input=(assertions:unknown[])=>mathOntologyCompileInputSchema.parse({schemaVersion:1,profile:'tm-owlrl-1',scope:'global',registryNquads:'',sourceManifest:release.files.source,assertions});
describe('exact compile job to artifact binding',()=>{
 it('rejects a valid native-only artifact for a different approved-delta job',async()=>{
  const a=JSON.parse(delta.files.review).assertions.find((a:{id:string})=>a.id==='urn:todaymath:assertion:synthetic-cross-partition-delta');
  await expect(verifyOntologyCompiledArtifactForInput(release,input([a]))).rejects.toThrow('COMPILED_INPUT_BINDING_MISMATCH');
 });
 it('accepts exact native-only bytes and rejects an injected extra assertion',async()=>{
  await expect(verifyOntologyCompiledArtifactForInput(release,input([]))).resolves.toMatchObject({identity:release.identity});
  await expect(verifyOntologyCompiledArtifactForInput(delta,input([]))).rejects.toThrow('COMPILED_INPUT_BINDING_MISMATCH');
 });
});
