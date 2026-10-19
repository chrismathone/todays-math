from pathlib import Path
from math import isqrt
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group12-review-20261020-r2/blind')
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def put(n,v):
 q=p/n;q.parent.mkdir(exist_ok=True)
 with q.open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
names=['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json'];before={n:sha(p/n) for n in names};s=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0];manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert s['studentDigest']=='778a1ee31c0edaf265e5e0fd191228e94c7dfffa1250f408f41a41270b8b20da';assert s['questionNumber']==21 and s['questionType']=='서술형';assert before['student-problems.json']==manifest['studentProblemsSha256'];assert s['choices']==[] and s['figures']==[]
probeText='q21 \ud55c\uae00 UTF-8 \uc77d\uae30\u00b7\uc4f0\uae30 \u2713\n';probe=p/'own-q21-blind-utf8-probe.txt'
with probe.open('x',encoding='utf-8',newline='\n') as f:f.write(probeText)
assert probe.read_text(encoding='utf-8')==probeText;assert probe.read_bytes()==probeText.encode('utf-8')
def square(n):return isqrt(n)**2==n
rows=[]
for k in range(75,86):
 indices=list(range(51,k));squares=[n for n in indices if square(n)];irrational=[n for n in indices if not square(n)];allowed=not square(k)
 assert len(irrational)==k-51-len(squares)
 rows.append({'k':k,'upperRootIrrational':allowed,'strictRadicandRange':[51,k-1],'totalInStrictRange':len(indices),'excludedPerfectSquares':squares,'irrationalRadicands':irrational,'irrationalCount':len(irrational),'allConditions':allowed and len(irrational)==29})
valid=[r['k'] for r in rows if r['allConditions']];assert valid==[82]
withoutUpperCondition=[r['k'] for r in rows if r['irrationalCount']==29];assert withoutUpperCondition==[81,82]
winner=next(r for r in rows if r['k']==82);assert winner['excludedPerfectSquares']==[64,81] and winner['irrationalCount']==29
assert 81<82<100;assert not square(82)
# Boundary controls: each excluded endpoint is irrational at the actual solution.
assert not square(50) and not square(82)
includeLower=[n for n in range(50,82) if not square(n)];includeUpper=[n for n in range(51,83) if not square(n)];assert len(includeLower)==len(includeUpper)==30
assert list(range(51,64))+list(range(65,81))==winner['irrationalRadicands'];assert len(range(51,64))==13 and len(range(65,81))==16
calc={'oracle':'정수 isqrt의 제곱 일치 검사만으로 완전제곱수를 구분하고 허용k75..85를 전부 세었다. 부동소수 근호값/이미지/저자params를 사용하지 않음.','strictBoundaries':'양의 제곱근의 대소 관계로 √50<√n<√k는50<n<k와 같음. 따라서 n=51,...,k-1이며50과k둘다제외. 목록1..k와도양립.','allKInGivenClosedBounds':rows,'allAllowedIntegers':[r['k'] for r in rows if r['upperRootIrrational']],'uniqueSolution':valid,'withoutUpperRootIrrationalCondition':{'solutions':[81,82],'why81Excluded':'√81=9는유리수. k81에서실제로29개이므로무리수조건이없다면해가2개가된다.'},'studentCountCases':[{'range':'75≤k≤81','perfectSquaresInOpenRadicandInterval':[64],'countExpression':'(k-51)-1=k-52','count29WouldGive':81,'survivesIrrationalUpperCondition':False},{'range':'82≤k≤85','perfectSquaresInOpenRadicandInterval':[64,81],'countExpression':'(k-51)-2=k-53','count29WouldGive':82,'survivesIrrationalUpperCondition':True}],'solutionExistence':{'k':82,'inGivenBounds':True,'upperRootIrrational':True,'all29Radicands':winner['irrationalRadicands'],'groupCount':'51~63의13개와65~80의16개,합29개','squaresChecked':'주어진구간안제곱수는64와81뿐;49는아래,100은위.'},'boundaryNegativeControlsAtK82':{'strictCount':29,'ifLowerEndpoint50Included':30,'ifUpperEndpoint82Included':30},'domainSignsUnits':{'radicandsPositiveNatural':True,'allRootsPositiveReal':True,'denominators':'나눗셈이없어분모0검사는해당없음.','unit':'수의개수와자연수k;별도물리단위없음.'},'methodAndApprovalBoundary':'2015중3의 양의 제곱근 대소/완전제곱수가아닌자연수의제곱근은무리수라는성질 및 자연수개수세기만사용. 함수의단조정리/고등공식/미적분/통계확률기법필요없음. 독립 raw풀이이며 정식수학·학년승인 건수는추가하지않음.','allRecordsOrChoices':'이문항은기록진단/객관식이아님. 실제choices=[]이고허용정수k75..85모두를검토했다.','visualBoundary':'figures=[]이고선택적preview는열지않음. 제공된학생JSON의인쇄조건만사용.'}
put('own-q21-blind-calculations.json',calc)
solution='자연수 n에 대하여 √n이 √50보다 크고 √k보다 작으려면 50<n<k이어야 한다. 두 경계가 모두 엄격하므로 세는 대상은 n=51,52,…,k-1이다. 이 가운데 완전제곱수의 제곱근은 유리수이고, 나머지 자연수의 제곱근은 무리수이다.\n\n75≤k≤85일 때 이 범위에서 주의할 완전제곱수는 64=8²와 81=9²이다.\n① 75≤k≤81이면 n의 범위는 51부터 k-1까지이고, 이 안의 완전제곱수는 64 하나이다. 전체 k-51개에서 하나를 빼면 무리수는 k-52개이다. 이것이 29개이면 k=81이다. 그러나 √81=9는 유리수이므로 주어진 √k의 무리수 조건에 어긋난다.\n② 82≤k≤85이면 n=51,…,k-1 안에 64와 81이 모두 들어간다. 따라서 무리수는 (k-51)-2=k-53개이다. k-53=29를 풀면 k=82이다.\n\nk=82는 75≤k≤85를 만족하며, 9²=81<82<100=10²이므로 82는 완전제곱수가 아니고 √82는 무리수이다. 실제로 세는 무리수의 피제곱수는 51~63의 13개와 65~80의 16개로, 합계 29개이다. 따라서 조건을 모두 만족하는 k는 82 하나뿐이다.\n\n특히 √k가 무리수라는 조건이 없으면 k=81일 때도 √50과 √81 사이의 무리수가 29개이므로 k=81과 82의 두 값이 가능하다. 이 조건이 81을 제외하여 답을 유일하게 정한다. 두 경계의 √50과 √k 자체는 세지 않는다.'
raw={'studentDigest':s['studentDigest'],'solverId':'codex-independent-helper-q21-blind-20261020-r2','answer':'82','solution':solution,'evidence':{'priorExactNewQuestionOrAuthorAnswerExposure':False,'authorAnswerExposure':False,'declaration':'정확한새q21또는저자답을보지않았다고학생파일열람전에선언. currentr2학생3파일과자체새파일만읽었고root/private/author/calculations/sourceq21/failedr1/다른문항/답검색을하지않았다.','ownIntegerOracle':calc,'inputHashes':before,'utf8ProbeSha256':sha(probe),'newMathOrGradeApprovalCount':0},'status':'solved'}
assert isinstance(raw['answer'],str) and isinstance(raw['solution'],str);put('solve/q21.json',raw)
assert before=={n:sha(p/n) for n in names}
put('own-q21-blind-seal-evidence.json',{'inputHashes':before,'inputsUnchanged':True,'rawSha256':sha(p/'solve/q21.json'),'calculationSha256':sha(p/'own-q21-blind-calculations.json'),'utf8ProbeSha256':sha(probe),'utf8ReadWritePassed':True,'authorAnswerExposure':False,'beforeAuthorPacket':True,'newMathOrGradeApprovalCount':0,'dbWrites':0})
print('raw SHA256 '+sha(p/'solve/q21.json'));print('calculation SHA256 '+sha(p/'own-q21-blind-calculations.json'))
