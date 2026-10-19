from pathlib import Path
from fractions import Fraction as F
from collections import Counter
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group3-review-20261020-r1/blind');h=lambda b:hashlib.sha256(b).hexdigest();items=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))
exposure={'currentAuthorAnswerSolutionPackageExposed':False,'priorSourceExposure':'이전 노변1학기 다수문항과노변2학기q09~11의학생풀이/저자해설/질문전용원문을검토했다. 관련대표값·산포도와다른시험기하검토이력도있다. 이번q12~14의현재저자답·해설·비공개패키지와원문은열지않았다. 전체원본코퍼스의완전미노출은주장하지않는다.','inputsUsed':'현재학생발문·표·5보기만; 저자답/원문키검색없음','noCovarianceFormulaUsed':True}
median=lambda xs:F(sorted(xs)[len(xs)//2]) if len(xs)%2 else F(sum(sorted(xs)[len(xs)//2-1:len(xs)//2+1]),2)
allDomain=[(a,16-2*a) for a in range(17) if a<16-2*a and 16-2*a>=0]
valid=[(a,b) for a,b in allDomain if median([a,b,1,9,12])==8];assert valid==[(4,8)]
assert [x for x in valid if x[0]>=1]==valid
answer12=median([2,4,8,6]);assert answer12==5
flags12=[F(x)==answer12 for x in [3,4,5,6,7]];assert flags12==[False,False,True,False,False]
known=[3,7,8,4,9,10,7];a=8*7-sum(known);assert sum(known)==48 and a==8
values=[3,7,8,4,a,9,10,7];freq=Counter(values);modes=sorted(x for x,n in freq.items() if n==max(freq.values()));assert modes==[7,8] and F(sum(values),8)==7
choices13=[[7],[8],[7,8],[7,9],[8,9]];flags13=[v==modes for v in choices13];assert flags13==[False,False,True,False,False]
records={'A':[2,4,3,6,7],'B':[3,5,6,5,8],'C':[9,7,8,4,3],'D':[1,2,4,3,6],'E':[4,3,6,8,7]};trend={}
for label,ys in records.items():
 diffs=[ys[i+1]-ys[i] for i in range(4)];trend[label]={'orderedPairs':list(zip(range(1,6),ys)),'adjacentChanges':diffs,'firstTwoY':ys[:2],'lastTwoY':ys[-2:],'observedScatterTrend':'overall-decreasing' if label=='C' else 'overall-increasing'}
 assert (ys[0]>ys[-1])==(label=='C')
 assert (min(ys[:2])>max(ys[-2:]))==(label=='C')
 assert sum(d<0 for d in diffs)=={'A':1,'B':1,'C':3,'D':1,'E':2}[label]
flags14=[label=='C' for label in records];assert flags14==[False,False,True,False,False]
solutions={12:'자료 A는5개이므로 크기순으로 정리했을 때 세 번째 값이 중앙값이다. 중앙값8은 실제 자료 중 하나여야 한다. 고정된 값1,9,12에는8이 없으므로 a나b가8이다. a=8이면 2a+b=16에서 b=0이 되어 a<b에 어긋난다. 따라서 b=8이고 a=4이다. 자료 A는1,4,8,9,12이므로 조건을 만족한다. 자료 B를 크기순으로 정리하면2,4,6,8이므로 중앙값은(4+6)/2=5이다. 보기3,4,5,6,7 중5만 같으므로③이다.',13:'자료가8개이고 평균이7이므로 전체 합은8×7=56이다. a를 제외한 일곱 값의 합은3+7+8+4+9+10+7=48이므로 a=56−48=8이다. 전체 자료에서7과8은 각각 두 번,3,4,9,10은 각각 한 번 나타난다. 따라서 최빈값은7,8을 모두 써야 한다. 보기①와②는하나를빠뜨리고,④와⑤는한번만나오는9를포함하므로옳지않다. 정답은③이다.',14:'같은 열의 x와y를짝지어 각 기록의 산점도를 생각한다. A는왼쪽의y2,4에서오른쪽의6,7로, B는3,5에서5,8로, D는1,2에서3,6으로, E는4,3에서8,7로전체적으로높아지는경향이있다. C는x가1,2일때y가9,7로높고x가4,5일때4,3으로낮아져전체적으로오른쪽아래로내려가는경향이다. C에서x2→3일때7→8로일시적으로증가해도전체적인음의상관관계는유지된다. 따라서음의상관관계가보이는기록은C,정답은③이다. 이판단은측정값의경향에관한것이며x의증가가y의감소를일으킨다는인과관계를뜻하지않는다.'}
calc={12:{'completeNonnegativeDomainPairs':allDomain,'medianA8ValidPairs':valid,'sortedA':[1,4,8,9,12],'sortedB':[2,4,6,8],'medianB':str(answer12),'choiceChecks':dict(zip('①②③④⑤',flags12)),'existenceUniqueness':'중앙값8은홀수5자료의중간원소이므로a또는b가8. a8분기는a<b위배,b8에서a4유일. 자연수를양의정수로보거나0포함으로보아도결과같음. 중앙값B분모2>0, 자료개수양수.'},13:{'knownSum':sum(known),'requiredTotal':56,'a':a,'data':values,'mean':str(F(sum(values),8)),'frequency':dict(freq),'allModes':modes,'choiceChecks':dict(zip('①②③④⑤',flags13)),'existenceUniqueness':'평균의분모8>0, 합식으로a8이유일하고자연수조건충족. 최빈값은가장큰빈도2를갖는두값을빠짐없이쓴집합으로유일.'},14:{'records':trend,'choiceChecks':dict(zip('①②③④⑤',flags14)),'existenceUniqueness':'5개기록각각유한한5쌍이다. 제공짝의산점도에서C만전반적인하강,나머지4개는상승. 단조감소/완전한직선일필요없음. 질적경향의충분한분리가있어유일한선택이다.','methodLimit':'공분산·상관계수·회귀·인과공식미사용. 인접변화/초반후반값의코드출력은실제산점도확인의보조기록이지일반상관판정공식이아니다.'}}
rows=[]
for it in items:
 q=it['questionNumber'];assert len(it['choices'])==5 and it['figures']==[]
 digest=h(json.dumps({k:v for k,v in it.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode());assert digest==it['studentDigest']
 surfaces={
 'stem':{'status':'student-method-proposed-in-scope','basis':('자연수두수의일차관계와홀수/짝수자료중앙값정의를적용한다.' if q==12 else '평균정의로자료합과빠진자연수를구하고최빈값을정의대로모두찾는다.' if q==13 else '같은열의짝측정값으로산점도의양/음경향을판단한다. 상관계수/인과추론이아니다.')},
 'choices':{'status':'all-five-checked','basis':('3,4,5,6,7을계산한중앙값5와비교하여③만일치.' if q==12 else '7단독/8단독/7과8/7과9/8과9의다섯목록을빈도와대조하여③만완전.' if q==13 else 'A,B,D,E의전체상승및C의전체하강을각각확인하여③만해당.')},
 'figuresAndTables':{'status':'student-table-checked','basis':('실제두기록표의A자료5개·중앙값8과B자료4개·빈칸을확인했다.' if q==12 else '실제한행의여덟자료를순서와개수를유지하여확인했다.' if q==13 else '실제5×5개측정값을열별짝으로확인하고자체산점도5개를그려view했다. 공분산계산없음.')+' 제공SVG는없다.'},
 'notation':{'status':'proposed-in-scope','basis':('자연수a,b,a<b,2a+b=16,중앙값과빈칸표시는이전일차식및중학교통계표기이다.' if q==12 else '자연수a,평균7,최빈값복수목록은중학교대표값표기이다.' if q==13 else 'x/y의쌍과음의상관관계용어는중학교산점도표현이다. x/y축의물리단위가미제공이므로임의단위를만들지않는다.')},
 'answer':{'status':'independently-solved','basis':'보기③만참임을정확한계산/전체기록관찰로확인. raw answer에는선택기호하나만저장하고수치및근거는solution/evidence로분리한다.'},
 'studentSolution':{'status':'own-method-proposed-author-unseen','basis':('중앙값의정렬정의와일차식·평균및빈도정의뿐이다.' if q!=14 else '학생해설은주어진짝의산점도상승/하강경향이며고등공분산공식과인과주장을사용하지않는다.')+' 현재저자해설은미노출이므로그해설은후속검토대상.'},
 'prerequisites':{'status':'2015-M3-after-prerequisites-proposal','basis':('2015중3대표값9수05-06의중앙값·평균·최빈값을학습한뒤배정. 이전자연수·부등관계·일차식·분수계산필요.' if q!=14 else '2015중3상관관계9수05-08의쌍측정값·산점도·양/음/없는상관을학습한뒤배정. 고등수치상관계수불필요.')+' 이전공식2015기준/중3배치열람이력은있으나이번새학생문항의정식7면·2022승인은후속전체해설검토와별개이다.'}}
 raw={'studentDigest':it['studentDigest'],'solverId':'independent-helper-nobyeon-sem2-group3-blind-20261020','answer':'③','solution':solutions[q],'evidence':{'exposure':exposure,'ownExactCalculations':calc[q],'studentDigestVerified':True,'gradeSurfaceProposals':surfaces,'domainUnits':'자연수/유한자료의정의역과양의자료개수·중앙값분모확인. 물리적길이나측정단위는제시되지않음.','limits':['수학solved와정식학년승인은구분;저자전체해설후속검토필요','새수동승인/출처/권리/livefamily/native승인아님','2022배치보류']},'status':'solved'}
 (p/'solve').mkdir(exist_ok=True)
 with (p/f'solve/q{q}.json').open('x',encoding='utf-8') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'studentDigest':digest,'answer':raw['answer'],'rawSha256':h((p/f'solve/q{q}.json').read_bytes())})
with (p/'own-nobyeon3-blind-results.json').open('x',encoding='utf-8') as f:json.dump({'inputSha256':h((p/'student-problems.json').read_bytes()),'exposure':exposure,'allOwnCalculations':calc,'ownScatterSha256':h((p/'own-nobyeon3-blind-scatter.svg').read_bytes()),'results':rows},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))

