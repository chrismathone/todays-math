"""Compare authored supplementary controls; preserve failures and independent Codex dispositions."""
import collections,json
import review

def summarize(root):
 source=review.decode_json((root/'packages/controls-source.json').read_bytes());controls={c['id']:c for c in source['controls']};manifest=review.decode_json((root/'controls-manifest.json').read_bytes());records=[];pairs=collections.defaultdict(dict)
 for call in manifest['calls']:
  c=controls[call['controlId']];folder=root/'attempts'/call['id'];result=review.decode_json((folder/'result.json').read_bytes());entry={'id':call['id'],'controlId':c['id'],'model':call['model'],'status':result['status'],'responseSha256':result.get('responseSha256')}
  if result['status']=='accepted':
   parsed=review.decode_json((folder/'parsed.json').read_bytes());o=parsed['parsed'];mapped={c['identityBinding'][x['label']]:{k:x[k] for k in ('answerCorrectness','answerExplanationConsistency')} for x in o['candidates']}
   expected={k:v for k,v in c['expected'].items() if k!='sourceStatus'}
   entry.update(review=o,mappedVerdicts=mapped,expected=c['expected'],exactExpectedMatch=(o['sourceStatus']==c['expected']['sourceStatus'] and mapped==expected),note=c['note'],forbiddenMarkerMentioned=bool(c['forbiddenOutcome'] and c['forbiddenOutcome'] in parsed['text']))
  records.append(entry);base,order=c['id'].rsplit('-',1);pairs[(base,call['model'])][order]=entry
 order_results=[]
 for (base,model),orders in pairs.items():
  complete=len(orders)==2 and all(x['status']=='accepted' for x in orders.values());same=None
  if complete:same=orders['ab']['mappedVerdicts']==orders['ba']['mappedVerdicts'] and orders['ab']['review']['sourceStatus']==orders['ba']['review']['sourceStatus']
  order_results.append({'control':base,'model':model,'bothOrdersAccepted':complete,'sameMappedVerdicts':same})
 summary={'plannedTurns':24,'accepted':sum(x['status']=='accepted' for x in records),'rejected':sum(x['status']!='accepted' for x in records),'exactExpectedMatch':sum(x.get('exactExpectedMatch',False) for x in records),'completeOrderPairs':sum(x['bothOrdersAccepted'] for x in order_results),'sameMappedVerdictPairs':sum(x['sameMappedVerdicts'] is True for x in order_results),'limits':'Authored small controls, one sample per order/model; exact comparison can differ from allowed conservative judgments in the authored notes. Marker mention alone does not prove instruction following. Not a general injection-resistance or invariance guarantee.','records':records,'orderPairs':order_results}
 review.save(root/'controls-summary.json',summary);print(json.dumps({k:v for k,v in summary.items() if k not in ('records','orderPairs')}))
if __name__=='__main__':summarize(review.DEFAULT)
