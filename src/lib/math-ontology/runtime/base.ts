import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { mathOntologyDigestSchema } from "@/contracts/mathOntology.contract";
import { ontologyDigest, canonicalOntologyJson, freezeOntology } from "../compiler/canonical";
import { loadSourcePartitionManifest } from "../sources/partitions";
const digest=mathOntologyDigestSchema;
export const packagedDescriptorSchema=z.strictObject({path:z.string().regex(/^ontology\/model\/releases\/[a-f0-9]{64}\/(?:[a-z0-9-]+\/[a-f0-9]\.proof\.gz|(?:catalog|signature)\.json\.gz)$/),byteHash:digest,rawByteHash:digest,bytes:z.number().int().nonnegative().max(8*1024*1024),rawBytes:z.number().int().nonnegative().max(64*1024*1024)});
export const packagedBaseSchema=z.object({format:z.literal("tm-packaged-base-1"),projectionHash:digest,sourceManifestHash:digest,sourceManifestPath:z.string(),sourceManifest:z.unknown(),profileHash:digest,ontologyHash:digest,shapesHash:digest,coverage:z.object({entities:z.number().int(),sourceAssertions:z.number().int(),primaryFocus:z.number().int(),proofs:z.number().int(),engineInferred:z.number().int(),witnessedInferred:z.number().int(),untracedInferred:z.number().int()}),localValidation:z.object({complete:z.literal(true),primaryFocus:z.number().int(),receiptsHash:digest}),globalValidation:z.object({complete:z.literal(true),globalRawCycleConforms:z.literal(true),globalClosureCycleConforms:z.literal(true),globalCycleNegativeRejected:z.literal(true),signatureHash:digest,closureHash:digest,proofHash:digest}),catalog:packagedDescriptorSchema,signature:packagedDescriptorSchema,partitions:z.array(z.object({key:z.string().regex(/^[a-z0-9-]+\/[a-f0-9]$/),proofs:z.number().int(),primaryProofs:z.number().int(),assertions:z.number().int(),sourcePartitionKeys:z.array(z.string()),artifact:packagedDescriptorSchema})),approval:z.literal("unreviewed-packaged-base-not-an-active-release")});
export type PackagedBase=z.infer<typeof packagedBaseSchema>;
export type PackagedDescriptor=z.infer<typeof packagedDescriptorSchema>;
export const packagedSourceSchema=z.strictObject({format:z.literal("tm-packaged-source-1"),baseHash:digest,projectionHash:digest,authorityDecisionId:z.string().regex(/^urn:todaymath:[^\s<>"{}|\\^`]+$/),scope:z.literal("global")});
export function readOntologyAsset(path:string):Buffer{
  if(!/^ontology\/(?:model\/releases|source-manifests\/public-v1)\/[a-f0-9]{64}\/[A-Za-z0-9/.-]+$/.test(path)||path.split('/').includes('..'))throw new Error('INVALID_PACKAGED_ASSET_PATH');
  // Keep the literal filesystem roots visible to Next/NFT. Runtime regex checks
  // alone do not narrow a statically unknown path relative to the repository root.
  if (path.startsWith('ontology/model/releases/'))
    return readFileSync(resolve(process.cwd(), 'ontology/model/releases', path.slice('ontology/model/releases/'.length)));
  return readFileSync(resolve(process.cwd(), 'ontology/source-manifests/public-v1', path.slice('ontology/source-manifests/public-v1/'.length)));
}
/** Only fixed deployment catalog entries can select a packaged base. */
export function loadPackagedOntologyBase(baseHash:string){
  digest.parse(baseHash);
  const catalog=z.strictObject({format:z.literal('tm-base-catalog-1'),bases:z.array(z.strictObject({baseHash:digest,projectionHash:digest,path:z.string().regex(/^ontology\/model\/releases\/[a-f0-9]{64}\/base\.json$/)}))}).parse(JSON.parse(readFileSync(resolve(process.cwd(),'ontology/model/releases/catalog.json'),'utf8')));
  const entry=catalog.bases.find(e=>e.baseHash===baseHash);if(!entry)throw new Error('PACKAGED_BASE_NOT_DEPLOYED');
  const bytes=readOntologyAsset(entry.path);if(bytes.length>2*1024*1024||ontologyDigest(bytes.toString('utf8'))!==baseHash)throw new Error('PACKAGED_BASE_HASH');
  const base=packagedBaseSchema.parse(JSON.parse(bytes.toString('utf8')));
  if(base.projectionHash!==entry.projectionHash||base.coverage.primaryFocus!==base.coverage.entities+base.coverage.sourceAssertions||base.localValidation.primaryFocus!==base.coverage.primaryFocus)throw new Error('PACKAGED_COVERAGE_MISMATCH');
  const sourceManifest=loadSourcePartitionManifest(readOntologyAsset,{projectionHash:base.projectionHash,manifestByteHash:base.sourceManifestHash});
  if(canonicalOntologyJson(sourceManifest)!==canonicalOntologyJson(base.sourceManifest))throw new Error('PACKAGED_SOURCE_MANIFEST_MISMATCH');
  if(base.profileHash!==ontologyDigest(readFileSync(resolve(process.cwd(),'ontology/rules/profile.json'),'utf8'))||base.ontologyHash!==ontologyDigest(readFileSync(resolve(process.cwd(),'ontology/model/tm-owlrl-1.ttl'),'utf8'))||base.shapesHash!==ontologyDigest(canonicalOntologyJson({runtime:readFileSync(resolve(process.cwd(),'ontology/shapes/runtime-core.ttl'),'utf8'),full:readFileSync(resolve(process.cwd(),'ontology/shapes/full.ttl'),'utf8')})))throw new Error('PACKAGED_POLICY_MISMATCH');
  return Object.freeze({base:freezeOntology(base),sourceManifest,baseHash});
}
export function readPackagedOntologyArtifact(base:PackagedBase,descriptor:PackagedDescriptor){
  if(base.catalog!==descriptor&&base.signature!==descriptor&&!base.partitions.some(p=>p.artifact===descriptor))throw new Error('UNBOUND_PACKAGED_DESCRIPTOR');
  const compressed=readOntologyAsset(descriptor.path);
  const hash=(value:Uint8Array)=>'sha256:'+createHash('sha256').update(value).digest('hex');
  if(compressed.length!==descriptor.bytes||hash(compressed)!==descriptor.byteHash)throw new Error('PACKAGED_ARTIFACT_HASH');
  const raw=gunzipSync(compressed,{maxOutputLength:descriptor.rawBytes});
  if(raw.length!==descriptor.rawBytes||hash(raw)!==descriptor.rawByteHash)throw new Error('PACKAGED_ARTIFACT_RAW_HASH');return raw;
}
