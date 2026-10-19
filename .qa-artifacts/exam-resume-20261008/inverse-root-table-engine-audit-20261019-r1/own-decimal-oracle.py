from pathlib import Path
from decimal import Decimal,localcontext,ROUND_HALF_UP
from fractions import Fraction as F
from math import isqrt
import json,re,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/inverse-root-table-engine-audit-20261019-r1');tasks=json.loads((p/'own-printed-tasks.json').read_text(encoding='utf-8'));results=[]
with localcontext() as ctx:
 ctx.prec=65
 for task in tasks:
  text=task['content'];lines=text.splitlines();inputs=[z.strip('$') for z in next(l for l in lines if l.startswith('|$x$|')).split('|')[2:-1]];printed=[z.strip('$') for z in next(l for l in lines if l.startswith('|$\\sqrt{x}$의 근삿값|')).split('|')[2:-1]];assert len(inputs)==len(printed)==5
  square=int(re.search(r'b\^\{2\}=(\d+)',text).group(1));b=isqrt(square);assert b*b==square and b>0
  target=F(re.search(r'계산한 결과는 \$(\d+\.\d{2})\$였다',text).group(1));cells=[];outputs=[]
  assert '양수 $a,b$' in text and '소수 넷째 자리에서 반올림하여 소수 셋째 자리' in text and 'a^{2}=\\dfrac{x}{100}' in text and '표의 소수값을 그대로 이용' in text
  for inp,pr in zip(inputs,printed):
   x=Decimal(inp);actual=x.sqrt();rounded=actual.quantize(Decimal('0.001'),rounding=ROUND_HALF_UP);assert format(rounded,'.3f')==pr
   s=F(pr);aApprox=s/10;output=100*aApprox+b;outputs.append(output);assert aApprox>0 and s*s!=F(inp)
   error=abs(actual-Decimal(pr));assert error<Decimal('0.0005')
   cells.append({'input':inp,'decimalSqrt65Digits':str(actual),'roundedThousandth':format(rounded,'.3f'),'error':str(error),'printedRootExactFraction':str(s),'aApproximationFraction':str(aApprox),'combinedOutputFraction':str(output),'combinedOutputDecimal':format(Decimal(output.numerator)/Decimal(output.denominator),'.2f'),'printedIsExactRadical':False})
  indices=[i for i,z in enumerate(outputs) if z==target];assert len(set(outputs))==5 and len(indices)==1
  idx=indices[0];results.append({'ordinal':task['ordinal'],'printedContentSha256':hashlib.sha256(text.encode()).hexdigest(),'cells':cells,'allFiveOutputsUnique':True,'targetFraction':str(target),'selectedColumnZeroBased':idx,'independentlyRecoveredAnswer':inputs[idx],'independentlyRecoveredParameters':{'start':int(F(inputs[0])*100),'bRoot':b,'index':idx},'existenceUniqueness':'finite five-column enumeration finds exactly one matching output, all positive roots; no monotonicity/function theorem required'})
assert len(results)==45
with (p/'own-decimal-rational-oracle.json').open('x',encoding='utf-8') as f:json.dump({'method':'Python Decimal sqrt precision65 and ROUND_HALF_UP to0.001; Fraction exact subsequent arithmetic. No parent BigInt squared-bound binary search or factory parameters/answers used.','phase':'computed from own-printed-tasks.json only before generated-draft answer/parameter comparison','tasks':45,'rootCells':225,'fiveColumnOutputs':225,'scaleProof':'a>0,a²=x/100 -> exact a=sqrt(x)/10. Printed root s approximates sqrt(x); a approximation=s/10; output=100(s/10)+b. s is not set equal to exact sqrt(x).','errorBounds':'|s-sqrt(x)|<0.0005; a approximation error<0.00005; combined value approximation error<0.005. Printed decimal arithmetic is exact only after selecting s.','results':results},f,ensure_ascii=False,indent=2);f.write('\n')
print('Independent oracle sealed:45 tasks,225 rounded cells,225 column outputs')
