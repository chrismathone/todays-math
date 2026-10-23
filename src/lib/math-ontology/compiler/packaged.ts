import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {mathOntologyCompileInputSchema} from '@/contracts/mathOntology.contract';
import type {SourceProjectionAuthority} from './sourceProjection';
import {loadPackagedOntologyBase,packagedSourceSchema} from '../runtime/base';
import {canonicalOntologyJson} from './canonical';
/** Called only with the transaction-resolved publisher decision, never client graph bytes. */
export async function preparePackagedSourceCompileInput(authority:SourceProjectionAuthority){
 const decision=await authority.verify();
 if(!decision.isSuperAdmin||!decision.active||decision.decisionId!==authority.decisionId||decision.approvedProjectionHash!==authority.expectedProjectionHash||authority.scope!=='global')throw new Error('SOURCE_RELEASE_AUTHORITY_DENIED');
 const catalog=JSON.parse(readFileSync(resolve(process.cwd(),'ontology/model/releases/catalog.json'),'utf8')) as {bases:{baseHash:string;projectionHash:string}[]};
 const selected=catalog.bases.find(b=>b.projectionHash===decision.approvedProjectionHash);if(!selected)throw new Error('APPROVED_SOURCE_BASE_NOT_DEPLOYED');
 const {base}=loadPackagedOntologyBase(selected.baseHash);
 const source=packagedSourceSchema.parse({format:'tm-packaged-source-1',baseHash:selected.baseHash,projectionHash:base.projectionHash,authorityDecisionId:decision.decisionId,scope:'global'});
 return mathOntologyCompileInputSchema.parse({schemaVersion:1,profile:'tm-owlrl-1',scope:'global',registryNquads:'',assertions:[],sourceManifest:canonicalOntologyJson(source)});
}
