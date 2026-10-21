from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,re,hashlib,copy
P=Path(__file__).resolve().parent;j=json.loads((P/'own-actual-outputs.json').read_text(encoding='utf-8-sig'));out=[]
def check(row):
 text=row['content'];t=row['key'].split('|')[-1];givens={k:int(v) for k,v in re.findall(r'\\overline\{(CA|CB|AB)\}=(\d+)\\,\\mathrm\{cm\}',text)}
 assert set(givens)==({'CA','CB'} if t=='09' else {'CB','AB'});assert '\\angle C=90^\\circ' in text;assert ('\\overline{CD}' if t=='09' else '\\overline{BD}') in text
 if t=='09':
  b=F(givens['CA']);a=F(givens['CB']);c2=a*a+b*b;c=F(isqrt(c2.numerator));assert c*c==c2;expected=a*b/c
 else:
  a=F(givens['CB']);c=F(givens['AB']);assert 0<a<c;b2=c*c-a*a;b=F(isqrt(b2.numerator));assert b*b==b2;expected=a*a/c
 assert a>0 and b>0 and c>0 and a+b>c and a*a+b*b==c*c
 x=b*b/c;h=a*b/c;bd=c-x;assert 0<x<c and h>0 and bd>0 and bd==a*a/c
 # Compute expected before accessing produced answer. Compare by integer cross multiplication.
 answer=row['answer'];assert '\\mathrm{cm}' in answer and 'cm}^' not in answer
 raw=answer.replace('$','').replace(r'\,\mathrm{cm}','');m=re.fullmatch(r'\\dfrac\{(\d+)\}\{(\d+)\}',raw)
 n,d=(int(m[1]),int(m[2])) if m else (int(raw),1);assert d>0 and n*expected.denominator==d*expected.numerator
 spec=row['figureSpec'];pts={k:tuple(F(str(v)) for v in p) for k,p in spec['points'].items()};assert set(pts)==set('ABCD')
 def sub(p,q):return tuple(u-v for u,v in zip(p,q))
 def dot(p,q):return sum(u*v for u,v in zip(p,q))
 def near(a,b):return abs(a-b)<=F(1,10**10)*max(F(1),abs(a),abs(b))
 A,B,C,D=(pts[k] for k in 'ABCD');assert A==(0,0) and B[1]==0 and C[1]<0 and D[1]==0 and C[0]==D[0] and 0<D[0]<B[0]
 scale=B[0]/c;assert scale>0 and near(B[0],170)
 assert near(dot(sub(C,A),sub(C,A)),b*b*scale*scale) and near(dot(sub(C,B),sub(C,B)),a*a*scale*scale)
 assert near(C[0],x*scale) and near(-C[1],h*scale) and near(B[0]-D[0],bd*scale)
 assert near(dot(sub(A,C),sub(B,C)),0) and near(dot(sub(C,D),sub(A,D)),0)
 assert spec['segments']=={'AB':['A','B'],'BC':['B','C'],'CA':['C','A'],'CD':['C','D']}
 assert spec['labels']=={k:k for k in 'ABCD'}
 marks=spec['angles'];assert len(marks)==2 and all(v.get('right') is True for v in marks.values());assert {(v['vertex'],tuple(v['points'])) for v in marks.values()}=={('C',('A','B')),('D',('C','A'))}
 dims=spec['dimensions'];assert len(dims)==2
 actual={''.join(sorted(v['points'])):v['label'] for v in dims.values()};wanted={''.join(sorted(k)):str(v)+' cm' for k,v in givens.items()};assert actual==wanted
 solution=row['solution']
 if t=='09':assert r'\sqrt{'+f'{int(a)}^2+{int(b)}^2'+'}' in solution and r'\overline{CD}' in solution
 else:assert r'\overline{CB}^2=\overline{BD}\times\overline{BA}' in solution and f'${int(a)}^2=' in solution
 return {'key':row['key'],'cohort':row['cohort'],'printedGivens':givens,'ownDerivedCA_CB_AB':[str(b),str(a),str(c)],'ownExpectedTarget':str(expected),'integerCrossMultiply':True,'positiveInteriorFoot':True,'uniqueTarget':'Positive lengths and C90 fix triangle up to congruence/reflection; orthogonal foot unique; CD=ab/c or BD=a²/c unique.','figureGivenOnly':True,'uniformScale':str(scale),'vectorOrthogonality':True,'ownGeometryMath':'09 Pythagoras then area equality;10 AA ABC~CBD, A↔C B↔B C↔D; independent BD=AB-CA²/AB as cross-check','sqrt09Grade':'UNKNOWN; no official grade decision made in this scope' if t=='09' else 'not assessed official grade'}
for row in j['rows']:out.append(check(row))
assert len(out)==80
coverage=[]
for key in sorted({r['key'] for r in j['rows']}):
 rows=[r for r in j['rows'] if r['key']==key];forced=[r for r in rows if r['cohort']=='forcedTripleAPI10'];assert len(forced)==10 and len({r['content'] for r in forced})==10
 coverage.append({'key':key,'actualAPICalls':len(rows),'seedCalls':sum(r['cohort']=='freshAPI30' for r in rows),'forcedCalls':len(forced),'distinctPrintedContent':len({r['content'] for r in rows}),'distinctContentAnswerFigure':len({json.dumps([r['content'],r['answer'],r['figureSpec']],sort_keys=True) for r in rows})})
negative=[]
for name,mutate in [('wrong-answer',lambda r:r.update(answer='$999\\,\\mathrm{cm}$')),('wrong-given-label',lambda r:r['figureSpec']['dimensions']['cb'].update(label='999 cm')),('hidden-CA-on10',lambda r:r['figureSpec']['dimensions'].update(ca={'points':['C','A'],'label':'20 cm'})),('foot-off-axis',lambda r:r['figureSpec']['points']['D'].__setitem__(1,1))]:
 row=copy.deepcopy(next(r for r in j['rows'] if r['key'].endswith('|10')));mutate(row)
 try:check(row);held=False
 except Exception:held=True
 assert held;negative.append({'name':name,'ownedSyntheticCheckerRejects':held})
before=json.loads((P/'own-before.json').read_text(encoding='utf-8'));sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();after={p:sha(p) for p in before};assert before==after
moduleAfter={p:sha(p) for p in j['moduleHashesAtFirstImport']};assert moduleAfter==j['moduleHashesAtFirstImport']
r={'actualOutputsChecked':len(out),'allPassed':True,'calculations':out,'coverage':coverage,'syntheticCheckerControls':negative,'before':before,'after':after,'importedModuleHashesAfter':moduleAfter};(P/'own-calculations.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'outputs':80,'coverage':coverage,'negativeCheckerControls':len(negative),'moduleHashesUnchanged':len(moduleAfter)},ensure_ascii=True))
