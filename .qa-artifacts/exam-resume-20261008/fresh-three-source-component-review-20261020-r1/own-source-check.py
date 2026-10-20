from pathlib import Path
from fractions import Fraction
from math import isqrt
import json,hashlib,copy
p=Path('.qa-artifacts/exam-resume-20261008/fresh-three-source-component-review-20261020-r1');read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
m=read(p/'input-manifest.json');before=read(p/'own-input-before.json');checks=[]
def check(label,condition):
 assert condition,label
 checks.append({'id':label,'passed':True})
records=[];patches=[]
for row in m['inputs']:
 if '/q0' not in row['path'].replace('\\','/'):continue
 f=p/row['path'];j=read(f);school=j['sourceIdentityAsProvided']['school'];n=j['number'];pdf=j['completedPdfQuestionReference'];fresh=pdf['freshParserQuestion'];key=school+'-q'+str(n).zfill(2)
 check(key+'-input-sha',h(f)==row['sha256']);check(key+'-five-choices',len(j['choices'])==len(fresh['choices'])==5);check(key+'-number-binding',n==fresh['number']==pdf['number']);check(key+'-independent-ownership',j['sharedSourceContext'] is None and not j['hwpFigureRecords'] and not j['figureCorrespondence']);check(key+'-question-only-no-answer',not any(x in j for x in ['answer','solution','answerKey']));check(key+'-score-stem-pdf',('[$'+str(int(fresh['score']))+'$점]') in j['stem']);check(key+'-math-anchor-provenance',len(j['mathExpressions'])>0 and all('payloadSha256' in x['source'] for x in j['mathExpressions']));check(key+'-original-reference-exists',any(x['path'].endswith(j['sourceIdentityAsProvided']['examId']+'.png') for x in m['inputs']))
 changes=[];proposed=copy.deepcopy(j)
 def patch(path,new):
  target=proposed
  for segment in path[:-1]:target=target[segment]
  old=target[path[-1]];target[path[-1]]=new
  changes.append({'path':path,'oldValueDigest':hashlib.sha256(json.dumps(old,ensure_ascii=False).encode()).hexdigest(),'newValueDigest':hashlib.sha256(json.dumps(new,ensure_ascii=False).encode()).hexdigest()})
 if school=='대구동중' and n==1:
  check('dong1-retain-inner-root',j['stem'].startswith('$\\sqrt{81}$의 음의 제곱근') and j['mathExpressions'][0]['script']=='sqrt {81}')
 if school in ['대구북중','대구일중'] and n==1:
  for idx in ([1,2] if school=='대구북중' else [0,4]):
   check(key+'-pm-location-'+str(idx),'+-' in j['choices'][idx]);patch(['choices',idx],j['choices'][idx].replace('+-',r'\pm '))
  check(key+'-retain-korean-term',any(c.startswith('제곱근 $') for c in proposed['choices']))
 if school=='대구북중' and n==3:
  patch(['completedPdfQuestionReference','freshParserQuestion','choices',0,'contents',0,'value'],r'\pi,-0.\dot{2}\dot{3}')
  patch(['completedPdfQuestionReference','freshParserQuestion','choices',2,'contents',0,'value'],r'\sqrt{\frac{35}{4}},\sqrt{2}-1')
  patch(['completedPdfQuestionReference','freshParserQuestion','choices',3,'contents',0,'value'],r'\sqrt{0.01},\sqrt{\frac{16}{9}}')
  check(key+'-HWP-fraction35-over4',any('35' in x['script'] and 'over {4}' in x['script'] for x in j['mathExpressions']))
  check(key+'-HWP-fraction16-over9',any('16' in x['script'] and 'over {9}' in x['script'] for x in j['mathExpressions']))
 if school=='대구일중' and n==3:
  check(key+'-missing-structured-score',j['printedScoreOccurrences']==[])
  marker='[$3$점]';patch(['printedScoreOccurrences'],[{'printed':marker,'value':3.0,'parentTotalMarked':False,'textOffset':j['stem'].index(marker),'evidence':'Original first page q3 printed3 points; current stem and selected PDF score3 agree. Local proposal only.'}])
 if school=='대구일중' and n==1:check(key+'-decimal04-retained',r'\sqrt{0.4}' in j['choices'][3] and r'\sqrt{0.04}' not in j['choices'][3])
 if changes:
  local=p/('own-proposed-'+j['sourceIdentityAsProvided']['examId']+'-q'+str(n).zfill(2)+'.local.json')
  proposed['independentLocalProposal']={'inputSha256':h(f),'sourceQuestionOnly':True,'notAuthoringOrApproval':True,'edits':changes,'originalHwpMathScriptsAndRawPdfDecodedCharactersPreserved':True}
  local.write_text(json.dumps(proposed,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  check(key+'-hwp-raw-preserved',proposed['mathExpressions']==j['mathExpressions'] and proposed['hwpAnchor']==j['hwpAnchor'])
  check(key+'-pdf-raw-preserved',proposed['completedPdfQuestionReference']['decodedText']==pdf['decodedText'] and proposed['completedPdfQuestionReference']['positionedCharacters']==pdf['positionedCharacters'])
  patches.append({'component':key,'localOnlyFile':local.name,'sha256':h(local),'changes':changes,'providedInputUntouched':True})
 records.append({'component':key,'recordPath':row['path'],'recordSha256':h(f),'hwpRecordIndex':j['hwpAnchor']['recordIndex'],'hwpPayloadSha256':j['hwpAnchor']['payloadSha256'],'mathRecordIndices':[x['source']['recordIndex'] for x in j['mathExpressions']],'pdfRegions':pdf['regions'],'pdfDecodedTextSha256':hashlib.sha256(pdf['decodedText'].encode()).hexdigest(),'pdfScore':fresh['score'],'choiceCount':5,'sharedHeaderObserved':False,'separateFigureObserved':False,'normalizationProposal':bool(changes)})
# Generic mathematical method controls, deliberately not evaluating any source question or selecting a key.
for innerRoot in [2,4,6,8]:
 n=innerRoot**4;negNested=-isqrt(isqrt(n));negSingle=-isqrt(n)
 check('generic-nested-distinction-'+str(n),negNested!=negSingle and negNested**2==isqrt(n))
for n in [0,4,16,25]:check('generic-principal-square-sign-'+str(n),isqrt(n)>=0 and isqrt(n)**2==n)
for q in [Fraction(49,16),Fraction(13,4),Fraction(1,16)]:
 rationalRoot=isqrt(q.numerator)**2==q.numerator and isqrt(q.denominator)**2==q.denominator
 check('generic-rational-root-'+str(q),rationalRoot==(q!=Fraction(13,4)))
check('generic-recurring-rational',Fraction(7,99)*99==7)
for a,b,q in [(2,6,Fraction(2)),(6,11,Fraction(3)),(17,18,Fraction(21,5))]:check('generic-positive-root-order-'+str(a),q>0 and a<q*q<b)
snap=read(p/'source-only-input/provided-live-family-snapshot.json');units={x['id']:x for x in snap['units']}
for uid in ['1682f01b-5293-4672-91cd-07fc02e305ac','28032bdd-3db3-4788-9e7a-2f1909233fdb','99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1']:check('captured-unit-'+uid,units[uid]['grade']=='중3' and units[uid]['semester']==1)
after=[{'path':x['path'],'sha256':h(p/x['path']),'bytes':(p/x['path']).stat().st_size} for x in m['inputs']];check('all14-inputs-unchanged',after==before['files']);check('manifest-unchanged',h(p/'input-manifest.json')==before['manifestSha256'])
receipt={'checks':checks,'passed':len(checks),'failed':0,'records':records,'localOnlyProposals':patches,'inputBefore':before,'inputAfter':after,'noSourceAnswersComputed':True,'noFullOriginalQuestionTextInThisReceipt':True,'primaryHtmlLocalOnly':True,'gradeApproval':False,'rightsApproval':False,'loadable':False}
(p/'own-source-check-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':len(checks),'records':len(records),'localOnlyProposals':len(patches),'allInputsUnchanged':True},indent=2))
