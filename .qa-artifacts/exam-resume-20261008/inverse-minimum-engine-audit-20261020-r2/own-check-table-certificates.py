from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal,localcontext,ROUND_HALF_UP
import json,hashlib,re
p=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r2');base=p.parent
read=lambda x:json.loads(x.read_text(encoding='utf-8-sig'));h=lambda x:hashlib.sha256(x.read_bytes()).hexdigest()
cur=read(p/'own-current69-drafts.json');binding=read(p/'own-r1-payload-oracle-binding.json')
assert cur['minimum']==read(p/'actual-drafts.json')['minimum'];assert cur['table']==read(p/'actual-drafts.json')['table']
prior=base/'inverse-root-table-engine-audit-20261019-r1';oracle=read(prior/'own-decimal-rational-oracle.json')
assert h(prior/'own-decimal-rational-oracle.json')==binding['table45']['priorOracleSha256']
cert=[]
for i,(d,o) in enumerate(zip(cur['table'],oracle['results'])):
 assert hashlib.sha256(d['content'].encode()).hexdigest()==o['printedContentSha256']
 lines=d['content'].splitlines();inputs=[F(c.strip('$')) for c in next(l for l in lines if l.startswith('|$x$|')).split('|')[2:-1]]
 roots=[F(c.strip('$')) for c in next(l for l in lines if l.startswith('|$\\sqrt{x}$')).split('|')[2:-1]]
 row=[]
 for x,s,old in zip(inputs,roots,o['cells']):
  assert str(x)==str(F(old['input'])) and s==F(old['printedRootExactFraction'])
  with localcontext() as ctx:
   ctx.prec=65;v=(Decimal(x.numerator)/Decimal(x.denominator)).sqrt();rounded=v.quantize(Decimal('0.001'),rounding=ROUND_HALF_UP)
  assert F(rounded)==s
  lo=s-F(1,2000);hi=s+F(1,2000)
  assert lo*lo<=x<hi*hi
  wrong=s+F(1,1000);assert not ((wrong-F(1,2000))**2<=x<(wrong+F(1,2000))**2)
  row.append({'input':str(x),'printedRoot':str(s),'squaredLower':str(lo*lo),'squaredUpper':str(hi*hi),'independentDecimalRounded':str(rounded),'midpointCertificatePassed':True,'producerPlusOneThousandthRejected':True})
 bSquare=int(re.search(r'b\^\{2\}=(\d+)',d['content'])[1]);bRoot=next(b for b in [7,13,23] if b*b==bSquare)
 outputs=[100*(s/10)+bRoot for s in roots];target=F(re.search(r'계산한 결과는 \$(\d+\.\d{2})\$',d['content'])[1]);matches=[j for j,v in enumerate(outputs) if v==target]
 assert len(matches)==1 and F(d['answer'])==inputs[matches[0]];assert len(set(outputs))==5
 cert.append({'ordinal':i,'cells':row,'allFiveOutputFractions':[str(v) for v in outputs],'selectedColumn':matches[0],'answer':d['answer'],'positiveBRoot':bRoot,'scale':'a positive implies exact a=sqrt(x)/10; printed approximation s/10 only; output10*s+b','priorSolutionBytesUnchanged':True})
result={'actualTableDraftsBoundBeforeOracleReuse':True,'newIndependentDecimalRoundingAndFractionCells':225,'newExactMidpointCertificates':225,'counterfactualPlusOneThousandthFailures':225,'columnOutputs':225,'results':cert,'notStudentMethods':'Decimal high precision and squared midpoint certificates are auditor computation; actual unchanged student solutions use printed table decimals, elementary positive-root scaling and one-variable rational arithmetic.'}
with (p/'own-table-certificates225.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
print('225 current table cells/outputs checked using Decimal+Fraction and squared bounds;225 shifted cells fail certificates')
