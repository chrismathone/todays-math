from pathlib import Path
from fractions import Fraction as F
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group15-review-20261020-r1/blind')
h=lambda b:hashlib.sha256(b).hexdigest()
probe='q01 독립 풀이 UTF-8 검사: 양의 제곱근과 반례'
with (p/'own-q01-blind-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as f:f.write(probe+'\n')
assert (p/'own-q01-blind-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
inputBytes=(p/'student-problems.json').read_bytes();data=json.loads(inputBytes.decode('utf-8-sig'))[0];manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert h(inputBytes)==manifest['studentProblemsSha256']
student={k:v for k,v in data.items() if k!='studentDigest'};assert h(json.dumps(student,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==data['studentDigest']
conditions=[lambda a,x:x>0,lambda a,x:x<0,lambda a,x:x!=0,lambda a,x:a>0,lambda a,x:x*x>0]
# Exact rational witnesses/counterexamples only. Universal proof uses the definition,
# not a claim that finite enumeration proves the theorem.
def premise(a,x):return a>0 and x*x==a
rows=[]
for root in [F(1,5),F(1,2),F(1),F(2),F(3),F(7,2),F(10)]:
 for x in [root,-root]:
  a=root*root;assert premise(a,x)
  rows.append({'a':str(a),'x':str(x),'principalRoot':str(root),'conclusion':x==root,'choicesSatisfied':[bool(f(a,x)) for f in conditions]})
for row in rows:
 if row['choicesSatisfied'][0]:assert row['conclusion']
 assert row['choicesSatisfied'][2] and row['choicesSatisfied'][3] and row['choicesSatisfied'][4]
a,x=F(1),F(-1);assert premise(a,x)
assert [bool(f(a,x)) for f in conditions]==[False,True,True,True,True]
assert not premise(F(0),F(0));assert not premise(F(-1),F(0))
choices=[]
for i,printed in enumerate(data['choices']):
 choices.append({'mark':'①②③④⑤'[i],'printed':printed,'sufficient':i==0,'nonvacuousWitness':{'a':'1','x':'1' if i==0 else '-1'},'counterexample':None if i==0 else {'a':'1','x':'-1','positivePrincipalRoot':'1','premise':True,'addedCondition':True,'conclusion':False},'reason':['x>0 and x²=a means x is the positive square root, uniquely sqrt(a).','x<0 selects the negative root; for a1,x-1 the conclusion fails.','a>0 already implies x≠0; this does not choose a sign.','This repeats the existing assumption a>0 and leaves both signs.','x²=a>0 already implies x²>0 and leaves both signs.'][i]})
assert len(choices)==5 and sum(c['sufficient'] for c in choices)==1
calc={'inputHashes':{name:h((p/name).read_bytes()) for name in ['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json']},'studentDigestIndependentlyRecomputed':data['studentDigest'],'universalStudentProof':'a>0 gives a well-defined positive principal root r=sqrt(a)>0. The two real square roots are r and -r, distinct because r>0. Thus x>0 selects r uniquely. Each other choice permits x=-r; a1,x-1 is an explicit exact witness. No advanced quadratic theorem required.','allFiveChoices':choices,'exactRationalWitnessChecks':rows,'finiteChecksLimitation':'14 rational examples check code logic and exact counterexamples; universal sufficiency is justified by positive square-root definition, not finite tests.','domain':{'aPositive':True,'sqrtADefinedAndPositive':True,'xNonzeroFromPremise':True,'twoDistinctRealRootBranches':True,'zeroCaseExcluded':'a0,x0 violates a>0','negativeAExcluded':'a<0 is outside assumption and cannot equal square of a real number','denominatorInStudentTask':False,'units':'abstract real numbers; no units or figures'},'existenceAndUniqueness':'For any allowed a>0, positive root r exists by the learned positive-root property and r is unique. Without the added sign condition both r and-r satisfy original conditions. Every listed extra condition has a nonempty valid instance, so no option is accepted through an impossible antecedent.','utf8WriteReadPassed':True,'authorAnswerExposure':False,'newApprovalCounts':0}
with (p/'own-q01-blind-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(calc,f,ensure_ascii=False,indent=2);f.write('\n')
solution='a>0이므로 √a는 양수인 제곱근이다. x²=a를 만족하는 실수 x는 √a 또는 −√a이고, √a>0이므로 두 값은 서로 다르며 x=0은 불가능하다. 따라서 x>0을 추가하면 음수인 −√a는 제외되고 x=√a만 남는다. 이 조건은 실제로 가능하다. 예를 들어 a=1,x=1은 모든 조건을 만족하며, 일반적으로도 양의 제곱근의 뜻에 따라 x=√a가 유일한 양수 해이다.\n\n① x>0: 양의 제곱근을 고르므로 항상 성립한다.\n② x<0: a=1,x=−1이면 원래 조건과 추가 조건을 만족하지만 x≠√a=1이므로 틀리다.\n③ x≠0: 같은 반례 a=1,x=−1이 가능하다. 원래 조건에서 이미 x≠0이므로 부호를 정하지 못한다.\n④ a>0: 이미 주어진 조건을 반복한다. a=1,x=−1이 반례이다.\n⑤ x²>0: x²=a>0에서 이미 성립한다. 역시 a=1,x=−1이 반례이다.\n따라서 정답은 ① 하나뿐이다. 모든 보기의 추가 조건을 만족하는 사례가 실제로 존재하므로, 불가능한 조건 때문에 형식적으로 참이 되는 경우도 없다. a>0으로 √a의 실수 정의역과 양수성이 보장되고, 물리 단위나 도형·분모 조건은 없다.'
raw={'studentDigest':data['studentDigest'],'solverId':'independent-helper-q01-blind-20261020-r1','answer':'①','solution':solution,'evidence':{'noAuthorAnswerExposureDeclaration':'새 q01의 정확한 문항이나 정답을 본 적이 없다고 학생 파일을 읽기 전에 선언했다. 지정된 학생용 brief/manifest/student-problems만 읽었으며 저자·부모·private·원문q01·verification·다른 문항·답 검색에 노출되지 않고 독립적으로 풀었다.','ownCalculationsFile':'../own-q01-blind-calculations.json','allFiveChoicesChecked':True,'counterexampleForChoices2Through5':{'a':'1','x':'-1','sqrtA':'1'},'domainExistenceUniquenessChecked':True,'universalProof':'양의 제곱근의 정의와 두 제곱근의 부호. a>0에서 두 가지±√a는 존재하며 서로 다르고, x>0은 유일한 양의 해를 선택한다.','codeOracle':'Fraction exact witness checks only; universal argument is student square-root definition, not finite-sample inference.','studentMethod':'2015 중3 제곱근의 뜻·성질, 양수/음수와 반례만 사용. 고등 함수나 이차방정식 공식 불필요. 정식 math/grade 승인은 blind raw 집계에 포함하지 않음.','utf8WriteReadPassed':True,'noPixelsOrAuthorOracle':True,'newApprovalCounts':0},'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
with (p/'solve/q01.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
assert isinstance(raw['solution'],str) and raw['answer']=='①';assert (p/'student-problems.json').read_bytes()==inputBytes
print('UTF-8, all5choices, exact counterexamples and domain/existence/uniqueness checks passed')
print('raw SHA256 '+h((p/'solve/q01.json').read_bytes()))
