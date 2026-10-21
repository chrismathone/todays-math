from pathlib import Path
from fractions import Fraction as F
import re,ast,json,hashlib
P=Path(__file__).resolve().parent;src=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/middle/m2Pytha.ts');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before=sha(src);assert before=='4ff96e1b029e37c9fc36be751bec3248fd8391ad0999cb4b4610fd7efd12efcb';text=src.read_text(encoding='utf-8-sig');triples=ast.literal_eval(re.search(r'const TRIPLES = (\[[\s\S]*?\]) as const;',text)[1]);rows=[]
for a,b,producer_c in triples:
 candidates=[n for n in range(1,a+b) if n*n==a*a+b*b];assert len(candidates)==1;c=candidates[0];assert c==producer_c and min(a,b,c)>0 and a+b>c
 h=F(a*b,c);bd=F(a*a,c);ad=F(b*b,c);assert 0<ad<c and 0<bd<c and ad+bd==c and c*h==a*b and h*h==ad*bd
 prose=f'피타고라스 정리에 의해 AB²={a}²+{b}²={c*c}={c}²이다. AB는 양수인 길이이므로 AB={c} cm이다. 삼각형 ABC의 넓이를 두 가지로 나타내면 ({a}×{b})/2=({c}×CD)/2이므로 CD={h} cm이다.'
 assert '√' not in prose and '\\sqrt' not in prose
 rows.append({'givenCA':b,'givenCB':a,'ownEnumeratedPositiveAB':c,'squareEquality':f'{a*a}+{b*b}={c*c}','own09CD':str(h),'own10BD':str(bd),'proposal09Solution':prose,'current10Method':'AA: ABC~CBD with A↔C,B↔B,C↔D; CB/BD=BA/CB, so CB²=BD*BA. No trig/discriminant/Vieta.','mathChecked':True,'gradeApproved':False})
assert len(rows)==10 and len({(r['givenCA'],r['givenCB']) for r in rows})==10 and before==sha(src);q=P/'own-utf8-probe.txt';q.write_text('교육과정 근거 분리: 직접 확인/추론/불명\n',encoding='utf-8');assert '불명' in q.read_text(encoding='utf-8');(P/'own-ten-triples-proposal.json').write_text(json.dumps({'sourceSHA256Before':before,'sourceSHA256After':sha(src),'triplesChecked':10,'allMathPassed':True,'sqrtFreeProposalOnly':True,'productionApplied':False,'rows':rows},ensure_ascii=False,indent=2),encoding='utf-8');print('10/10 exact square/positive/area/AA cross-checks pass; QA prose only')
