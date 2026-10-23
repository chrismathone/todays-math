import {it,expect,vi} from 'vitest';
import {ontologyDigest} from '@/lib/math-ontology/compiler/canonical';
const call=vi.hoisted(()=>vi.fn());
vi.mock('server-only',()=>({}));
vi.mock('@/lib/math-insight/config',()=>({insightModelConfig:()=>({vendor:'anthropic',model:'synthetic-only'})}));
vi.mock('@/lib/studio-ai/api',()=>({runModelApi:call}));
import {requestOntologyCompletion} from '@/lib/math-ontology/retrieval/model.server';
import {ontologyIntentJsonSchema} from '@/lib/math-ontology/retrieval/modelSchemas';
it('forwards the static provider grammar and captures the exact original returned-text receipt once',async()=>{
 const raw='```json\n{"intent":"unknown","searchTerms":[],"context":"global"}\n```';
 const receipt={vendor:'anthropic',requestedModel:'synthetic-only',reportedModel:null,responseId:null,completionReason:'end_turn',responseTextHash:ontologyDigest(raw),usage:null};
 call.mockImplementationOnce(async input=>{input.onReceipt(receipt);return raw;});
 const result=await requestOntologyCompletion('synthetic prompt',new AbortController().signal,ontologyIntentJsonSchema);
 expect(call).toHaveBeenCalledTimes(1);expect(call.mock.calls[0][0]).toMatchObject({jsonSchema:ontologyIntentJsonSchema,singleAttempt:true,suppressUpstreamDetails:true});
 expect(result).toEqual({raw,receipt});
});
