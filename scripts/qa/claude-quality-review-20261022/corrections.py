"""One coordinator-authorized format-only correction per initial non-refused schema failure."""
import copy,json,random
import review

def freeze(root):
 plan=review.decode_json((root/'text-schema-failure-plan.json').read_bytes());review.git(root,'merge-base','--is-ancestor',plan['originalRawSeal'],'HEAD')
 calls=[]
 for original in plan['failedCalls']:
  if not original['eligibleFormatOnly']:raise review.EvidenceError('correction ineligible')
  folder=root/'attempts'/original['id'];r=review.decode_json((folder/'result.json').read_bytes())
  if r['status']!='rejected' or r['stopReason']!='end_turn':raise review.EvidenceError('not non-refused schema failure')
  req=review.decode_json((root/original['requestPath']).read_bytes());base=copy.deepcopy(req)
  old_schema=review.schema();item=old_schema['properties']['candidates']['items']
  fixed={'type':'object','properties':{'sourceStatus':old_schema['properties']['sourceStatus'],'sourceEvidence':old_schema['properties']['sourceEvidence'],'candidateA':copy.deepcopy(item),'candidateB':copy.deepcopy(item)},'required':['sourceStatus','sourceEvidence','candidateA','candidateB'],'additionalProperties':False}
  fixed['properties']['candidateA']['properties']['label']['enum']=['A'];fixed['properties']['candidateB']['properties']['label']['enum']=['B']
  req['output_config']['format']['schema']=fixed
  req['messages'][0]['content']+='\n\nFORMAT REQUIREMENTS: Give exactly both reviews in the required candidateA (label A) and candidateB (label B) objects. sourceEvidence and each checkingEvidence must contain a nonempty, concise, externally checkable explanation; never empty or a placeholder. Assess both candidates even if their answers agree. Use this fixed-object output schema; the input data and requested judgments are unchanged.'
  ident=original['id']+'-format';path=f'requests/{ident}.json';review.save(root/path,req)
  calls.append({**original,'id':ident,'kind':'text-review-format','requestPath':path,'requestSha256':review.digest(review.encoded(req)),'replacesSchemaFailure':original['id']})
 random.Random(20261022).shuffle(calls)
 review.save(root/'format-manifest.json',{'createdAt':review.now(),'calls':calls,'originalRawSeal':plan['originalRawSeal'],'authorization':'coordinator msg_5abc6bcec027','noPriorReviewerResponses':True,'syntaxOnly':True})
 commit=review.seal(root,'Freeze authorized format-only correction requests for23 strict schema failures')
 review.save(root/'format-freeze.json',{'commit':commit,'manifest':'format-manifest.json'})
 print(json.dumps({'calls':len(calls),'freeze':commit}))
if __name__=='__main__':freeze(review.DEFAULT)
