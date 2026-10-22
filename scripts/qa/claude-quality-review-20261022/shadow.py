"""Post-hoc full30 shadow arm: only model/effort/token literals change in frozen wire bytes."""
import copy,json,random,re
import review

def freeze(root):
 models=review.decode_json((root/'models-response.json').read_bytes());model=next(x for x in models['data'] if x['id']=='claude-opus-5-5');cap=model['capabilities']
 if not cap['image_input']['supported'] or not cap['effort']['high']['supported'] or model['max_tokens']<8192:raise review.EvidenceError('shadow capability')
 review.save(root/'shadow-capability-confirmation.json',{'at':review.now(),'freshAuthenticationResponseSha256':review.digest((root/'models-response.json').read_bytes()),'model':model['id'],'imageInput':True,'effortHigh':True,'outputLimit':model['max_tokens'],'source':'Fresh official Models check at start of this scoped run'})
 calls=[]
 for series in ('fixed','independent'):
  manifest=review.decode_json((root/f'{series}-manifest.json').read_bytes())
  for c in manifest['calls']:
   original=(root/c['requestPath']).read_bytes()
   if review.digest(original)!=c['requestSha256']:raise review.EvidenceError('shadow source bytes changed')
   body=original
   for pattern,replacement in [(rb'("model"\s*:\s*")claude-opus-5(")',rb'\g<1>claude-opus-5-5\2'),(rb'("effort"\s*:\s*")medium(")',rb'\g<1>high\2'),(rb'("max_tokens"\s*:\s*)4096',rb'\g<1>8192')]:
    body,count=re.subn(pattern,replacement,body)
    if count!=1:raise review.EvidenceError('shadow literal substitution count')
   a=review.decode_json(original);b=review.decode_json(body);expected=copy.deepcopy(a);expected['model']='claude-opus-5-5';expected['max_tokens']=8192;expected['output_config']['effort']='high'
   if b!=expected:raise review.EvidenceError('shadow changed prompt/image or other settings')
   review.check_request(b)
   ident='shadow-'+c['sourceRequestId'];path=f'requests/{ident}.json';review.private_write(root/path,body)
   calls.append({**c,'id':ident,'kind':'product-shadow','sourceCallId':c['id'],'sourceRequestSha256':c['requestSha256'],'requestPath':path,'requestSha256':review.digest(body),'model':b['model']})
 if len(calls)!=30 or len({c['id'] for c in calls})!=30:raise review.EvidenceError('shadow full30 denominator')
 random.Random(20261022).shuffle(calls)
 review.save(root/'shadow-manifest.json',{'createdAt':review.now(),'calls':calls,'posthocDiagnostic':True,'interventions':{'model':['claude-opus-5','claude-opus-5-5'],'effort':['medium','high'],'max_tokens':[4096,8192]},'sameFrozenPromptAndImageWireBytes':True,'appSupported':False,'authorization':'coordinator msg_03577845e789','noPreviousOutcomesInInput':True,'tools':0})
 commit=review.seal(root,'Freeze full30 posthoc Opus5.5 high OCR shadow arm with unchanged prompt/image bytes')
 review.save(root/'shadow-freeze.json',{'commit':commit,'manifest':'shadow-manifest.json'});print(json.dumps({'calls':30,'freeze':commit}))
if __name__=='__main__':freeze(review.DEFAULT)
