from pathlib import Path
import json,hashlib,difflib,subprocess
P=Path(__file__).resolve().parent; Q=P.parent; read=lambda p:json.loads(p.read_text(encoding='utf-8-sig')); sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest(); S=read(P/'provided-scope.json');R=Path(S['root']);O=Q/'inverse-equation-degree-code-audit-20261020-r1'
checks=[]
def ck(n,v):checks.append({'name':n,'pass':bool(v)})
paths=[Path(v['rootReadOnly']) for v in S['code']]+[Path(v['immutableCopy']) for v in S['code']]+[P/'private/generated26.json',Q/'inverse-equation-degree-proposal-20261020-r2/student-only26.json',Q/'inverse-equation-degree-proposal-20261020-r1/own-raw-solutions-r1.json',Path(S['currentIndexFor170HashChecks']),Path(S['bindingAuditFor170And275'])]+list(O.glob('own-*'))
index=read(Path(S['currentIndexFor170HashChecks']));binding=read(Path(S['bindingAuditFor170And275'])); candidates=[c for g in index['groups'] for c in g['candidates']];ck('170index-size',len(candidates)==170)
for c,row in zip(candidates,binding['rows']):
 p=R/c['candidate']['path'];paths.append(p);ck('candidate-hash/'+c['twinExternalId'],sha(p)==c['candidate']['sha256']==row['candidate']['sha256']);ck('candidate-index-binding/'+c['twinExternalId'],c['twinExternalId']==row['id'] and c['candidate']['path']==row['candidate']['path'])
changed=[];diff=[]
for v in S['code']:
 p=Path(v['rootReadOnly']);cop=Path(v['immutableCopy']);ck('root-copy/'+v['path'],sha(p)==sha(cop)==v['sha256']);old=O/'provided-code'/v['path'];
 if sha(old)!=sha(p):changed.append(v['path']);diff.extend(difflib.unified_diff(old.read_text(encoding='utf-8').splitlines(True),p.read_text(encoding='utf-8').splitlines(True)))
ck('only-one-source-changed',changed==['src/lib/examStudy/families/middle/inverseEquationDegree.ts'])
(P/'own-source-delta.diff').write_text(''.join(diff),encoding='utf-8')
# Single-line solution and version are the only non-equal lines.
old=(O/'provided-code'/changed[0]).read_text(encoding='utf-8').splitlines();new=Path(S['code'][0]['rootReadOnly']).read_text(encoding='utf-8').splitlines();lineChanges=[(n+1,a,b) for n,(a,b) in enumerate(zip(old,new)) if a!=b]
ck('two-lines-only',len(old)==len(new) and len(lineChanges)==2 and lineChanges[0][1].strip().startswith('solution:') and lineChanges[1][2].strip()=='version: "2-student-wording",')
raw=read(Q/'inverse-equation-degree-proposal-20261020-r1/own-raw-solutions-r1.json');oldDrafts=read(O/'private/generated26.json')['questions'];newDrafts=read(P/'private/generated26.json')['questions'];students=read(Q/'inverse-equation-degree-proposal-20261020-r2/student-only26.json');rows=[]
for o,n,r,student in zip(oldDrafts,newDrafts,raw['solutions'],students['questions']):
 num=n['n'];delta=[k for k in o.keys()|n.keys() if o.get(k)!=n.get(k)];ck(f'{num}/only-solution-changed',delta==['solution']);ck(f'{num}/sealed-student-answer',n['content']==student['content'] and student['studentDigest']==r['studentDigest']==hashlib.sha256(n['content'].encode()).hexdigest() and n['answer']==r['answer']);e=r['evidence'];v=e['independentPrintedFactorReading'];p,q,a,s,t=map(int,[v['leftSubtractConstant'],v['leftXAddend'],v['rightX2Coefficient'],v['rightExtraXCoefficient'],v['rightConstant']]); L=a*(q-1)-p-s;qa='a' if q==1 else str(q)+'a';lx='x' if L==1 else '-x' if L==-1 else str(L)+'x'; forms=[f'ax^2+({qa}-{p})x-{p*q}',f'(a-{a})x^2+({qa}-{p}-a-({s}))x-{p*q+t}=0',f'{lx}-{p*q+t}=0'];ck(f'{num}/current-all-formulas',all('$'+f+'$' in n['solution'] for f in forms));ck(f'{num}/current-nonzero-unique',L!=0 and '여기서 $x$의 계수는 $0$이 아니므로 실제로 일차방정식이 된다.' in n['solution'] and '다른 $a$의 값에서는 이차항이 남으므로' in n['solution']);ck(f'{num}/no-number-particle',not any(z in n['solution'] for z in ['$2$과','$4$과',f'${L}$은']));ck(f'{num}/no-advanced-method',not any(z in n['solution'] for z in ['판별식','근의 공식','근과 계수','미분','행렬']));rows.append({'n':num,'studentDigest':r['studentDigest'],'answer':r['answer'],'L':L,'C':-p*q-t,'rootX':e['rootX'],'solutionSHA256':hashlib.sha256(n['solution'].encode()).hexdigest(),'formulas':forms})
ck('correct-r2-labels',students['courseAsProposed']=='중3' and all(x['questionType']=='단답형' for x in students['questions']))
# Preserve all R1 owned bytes against the actual sealed Git blobs, not mutable HEAD.
repo=Path.cwd()
for p in O.glob('own-*'):
 ck('R1sealed/'+p.name,subprocess.check_output(['git','show','5263b3973c884346f8e8c6772e47f111de351628:'+p.relative_to(repo).as_posix()])==p.read_bytes())
(P/'own-before.json').write_text(json.dumps({str(p):sha(p) for p in paths},indent=2),encoding='utf-8');(P/'own-current-checks.json').write_text(json.dumps({'checks':checks,'counts':{'assertions':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks)},'rows':rows,'changedSourceLines':[x[0] for x in lineChanges],'candidateHashOnly':True,'reviewReferenceSelectionPending':True},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'count':len(checks),'failures':[x for x in checks if not x['pass']]}))
