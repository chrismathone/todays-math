"""Summarize strict fresh reviews without upgrading source holds or changing old selections."""
import argparse,collections,json
from pathlib import Path
import review

def summarize(root,selected=False):
 bindings=review.decode_json((root/'candidate-bindings.json').read_bytes())
 prior=review.decode_json((review.OLD/'private/direct-review.json').read_bytes())
 old={x['packetId']:x for x in prior['records']}
 records=[];states=collections.Counter();correctness=collections.Counter();consistency=collections.Counter();findings=[]
 for b in bindings:
  reviewers=[];by_author=collections.defaultdict(list)
  labels={x['label']:x for x in b['candidates']}
  for suffix in ('opus','sonnet'):
   folder=root/'attempts'/(b['id']+'-review-'+suffix)
   initial_folder=folder
   if selected and (root/'attempts'/(folder.name+'-format')/'result.json').exists():
    replacement=root/'attempts'/(folder.name+'-format')
    if review.decode_json((replacement/'result.json').read_bytes())['status']=='accepted':folder=replacement
   r=review.decode_json((folder/'result.json').read_bytes()) if (folder/'result.json').exists() else {'status':'pending'}
   states[r['status']]+=1
   entry={'reviewer':suffix,'status':r['status'],'responseSha256':r.get('responseSha256'),'selectedAttempt':folder.name,'formatClarified':folder!=initial_folder}
   if r['status']=='accepted':
    o=review.decode_json((folder/'parsed.json').read_bytes())['parsed'];entry['review']=o
    for c in o['candidates']:
     author=labels[c['label']]['authorModel'];by_author[author].append({'reviewer':suffix,**c})
     correctness[(suffix,author,c['answerCorrectness'])]+=1;consistency[(suffix,author,c['answerExplanationConsistency'])]+=1
   reviewers.append(entry)
  old_equivalent=all(old[p]['pairAnswerReading']=='equivalent_at_answer_level' for p in b['packets'])
  flags=[]
  if any(x['status']!='accepted' for x in reviewers):flags.append('review_missing_or_rejected')
  accepted=[x['review'] for x in reviewers if x['status']=='accepted']
  if any(x['sourceStatus']!='sufficient' for x in accepted):flags.append('source_concern')
  if any(c['answerCorrectness']!='correct' or c['answerExplanationConsistency']!='consistent' for o in accepted for c in o['candidates']):flags.append('candidate_concern')
  if len(accepted)==2:
   maps=[{labels[c['label']]['authorModel']:(c['answerCorrectness'],c['answerExplanationConsistency']) for c in o['candidates']} for o in accepted]
   if maps[0]!=maps[1] or accepted[0]['sourceStatus']!=accepted[1]['sourceStatus']:flags.append('reviewer_disagreement')
  if old_equivalent and 'candidate_concern' in flags:flags.append('concern_in_former_answer_agreement')
  if set(b['packets'])&{'q047-a','q167-a'}:flags.append('preserved_source_hold')
  record={'id':b['id'],'studentSha256':b['studentSha256'],'packets':b['packets'],'priorAnswerEquivalent':old_equivalent,'flags':flags,'byAuthor':dict(by_author),'reviewers':reviewers}
  records.append(record)
  if flags:findings.append(record)
 summary={'createdAt':review.now(),'uniqueProjections':len(bindings),'candidateAnswers':len(bindings)*2,'plannedReviewTurns':len(bindings)*2,'strictStates':dict(states),'answerCorrectnessCounts':[{'reviewer':k[0],'candidateAuthor':k[1],'verdict':k[2],'count':v} for k,v in sorted(correctness.items())],'consistencyCounts':[{'reviewer':k[0],'candidateAuthor':k[1],'verdict':k[2],'count':v} for k,v in sorted(consistency.items())],'flags':dict(collections.Counter(f for x in findings for f in x['flags'])),'sourceHoldsPreserved':['q047-a','q167-a'],'sameProviderNonblind':True,'notDatabaseCorrections':True,'records':records}
 prefix='selected-' if selected else ''
 for name,obj in [(prefix+'text-review-summary.json',summary),(prefix+'text-review-findings.json',findings)]:
  tmp=root/(name+'.tmp');tmp.write_bytes(review.encoded(obj));tmp.chmod(0o600);tmp.replace(root/name)
 print(json.dumps({k:v for k,v in summary.items() if k!='records'}));return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=review.DEFAULT);p.add_argument('--selected',action='store_true');a=p.parse_args();summarize(a.root,a.selected)
