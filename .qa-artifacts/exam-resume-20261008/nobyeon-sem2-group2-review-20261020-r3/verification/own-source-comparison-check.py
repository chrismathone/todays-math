from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess
base=Path('.qa-artifacts/exam-resume-20261008');old=base/'nobyeon-sem2-group2-review-20261020-r2';p=base/'nobyeon-sem2-group2-review-20261020-r3';v=p/'verification';ctx=p/'source-only-context';load=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();canon=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
f=v/'own-source-comparison-utf8.txt';f.write_text('원문 질문 전용 비교·기존 봉인 보존\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='원문 질문 전용 비교·기존 봉인 보존\n'
cm=load(ctx/'context-manifest.json');entries=load(v/'verification-inputs.json');prev=load(old/'verification/verification-inputs.json');manifest=load(v/'verification-manifest.json');seal=load(v/'sealed-raw-commit.json');assert h(v/'verification-inputs.json')==manifest['verificationInputsSha256']
sourceObservations={9:{'sourceObserved':'원문 질문·그림은 연못 가장자리AB거리를 묻고, AC8m,BC12m, C60°를 제공한다. 원문5개보기는m 단위 근호 길이이다. 참고그림에는 수선이 없으나 A에서BC로수선을 내려 실제 두 직각삼각형을 만들 수 있다.','sharedCore':'원문의 두 변과끼인각은 한 직각삼각형에서높이와투영을 정하고 전체밑변에서나머지투영을 얻어 피타고라스로목표거리를구하는 절차를 허용한다. 새문항은 PR과PQ를주고 H내부조건하에서투영둘을합해QR을구한다. 두실제직각삼각형의삼각비/피타고라스라는같은핵심이다. 코사인법칙이나원문답은사용하지않았다.','substantiveChange':'원문에서주어진밑변전체를새목표로, 원문의목표측면거리를새입력으로조직했다. 수선발내부를명시해부호를고정하고측량상황을추상삼각형으로재표현했다. 숫자/점이름만바꾼변형이아니다.','symbolicProcedure':'source: height=a·sin60°, projection=a·cos60°, remaining=b−projection, target²=height²+remaining². current: same height/projection fromgiven side, remaining²=givenOtherSide²−height², total=projection+positiveRemaining. Original numeric target/key not evaluated.'},10:{'sourceObserved':'원문질문과참고그림은같은쪽지면A-B-D순서, AB8m와45°/60°관측각에서나무높이CD를묻는다. 원문의5보기도m단위근호식이다.','sharedCore':'원문과새문항모두하나의수직높이를공유하는두직각삼각형에서tan45°와tan60°의맞은편/이웃변정의로각밑변을구하고순서에따라차를쓴다. 삼각비사이항등식을필요로하지않는다.','substantiveChange':'원문은간격을입력으로높이를미지수로정하지만,현재는높이를입력으로간격을목표로정한다. 나무를기둥으로바꾼소재변화만이아니라거리/높이의입출력역전이실제수식에반영된다.','symbolicProcedure':'source: gap=h/tan45°−h/tan60°, solve for h. current: h known, compute both ground distances and their difference. No original numeric height/key evaluated.'},11:{'sourceObserved':'원문은중앙값이항상원자료에있는지,편차총합과표준편차,복수최빈값,편차제곱평균,절대편차와평균거리의5추상주장에대한조합형객관식이다. 원문에수치자료나표는없다.','sharedCore':'새자료1,5,5,7,7,11에각정의를적용하면중앙값6은원자료밖에있고,최빈값5/7은복수이며,편차총합0,분산9,표준편차3,최대거리변량1/11이다. 이5개념연결을원문과직접대응시켰다.','substantiveChange':'추상명제조합선택에서새유한자료의요약기록오류를수정하는과제로변경했다. ㄱ~ㅁ라벨은원문명제와동일내용을복사하지않고,서로다른순서의실제통계값을조직한다. 특히분산3오기를9로고치는진단형보기는새계산/표현이다. 공유개념은행내용변경은없다.','symbolicProcedure':'current: median=(5+7)/2; deviations=x−6; variance=sum(deviation²)/6; modes byfrequency; distance=abs(deviation). Original MC combination/key not selected or compared.'}}
# Recheck the immutable current exact math without using source answers.
assert 12**2-6**2==108 and 9*21-108==81 and 6+9==15
assert (-9,9) in [(-3,3),(9,0),(-9,9),(0,9),(9,9)]
data=[1,5,5,7,7,11];assert sum(data)==36;dev=[F(x)-6 for x in data];assert sum(dev)==0 and sum(x*x for x in dev)/6==9 and F(data[2]+data[3],2)==6
before={};rows=[]
for e in entries:
 q=e['candidate']['questionNumber'];pe=next(x for x in prev if x['candidate']['questionNumber']==q);s=next(x for x in cm['questions'] if x['n']==q);sf=ctx/s['question']['path'];assert h(sf)==s['question']['sha256'];src=load(sf);assert src['originalAnswersOmitted'] and src['originalSolutionsOmitted']
 before[str(sf)]=h(sf);sourceHashes={'questionSha256':h(sf)}
 if 'sourceFigure' in s:
  fig=ctx/s['sourceFigure']['path'];assert h(fig)==s['sourceFigure']['sha256'];sourceHashes['referenceFigureSha256']=h(fig);before[str(fig)]=h(fig)
 for k in ['candidate','studentDigest','candidateDigest','assetDigest','solveDigest','independentSolve']:assert e[k]==pe[k]
 rp=p/f'blind/solve/q{q:02}.json';op=old/f'blind/solve/q{q:02}.json';assert rp.read_bytes()==op.read_bytes();assert rp.read_bytes()==subprocess.check_output(['git','show',f'ab41f0db4a50b72762805929db1465cc316a4b21:{op.as_posix()}'])
 proof=next(x for x in seal['proofs'] if x['n']==q);assert h(rp)==proof['sha256']
 oldreport=old/f'verification/reports/q{q:02}.json';oldbytes=oldreport.read_bytes();assert oldbytes==subprocess.check_output(['git','show',f'd5bee0fc79f0074076cb97cac72f45f8415bf7a1:{oldreport.as_posix()}']);report=load(oldreport)
 for f in [rp,op,oldreport]:before[str(f)]=h(f)
 for rel in [f'package/private/q{q:02}/candidate.json']+([f'package/private/q{q:02}/figure-1.spec.json',f'package/private/q{q:02}/figure-1.svg'] if q!=11 else []):
  assert (p/rel).read_bytes()==(old/rel).read_bytes();before[str(p/rel)]=h(p/rel);before[str(old/rel)]=h(old/rel)
 report.update(studentDigest=e['studentDigest'],candidateDigest=e['candidateDigest'],assetDigest=e['assetDigest'],solveDigest=e['solveDigest'],verifierId='independent-helper-nobyeon-sem2-group2-source-r3-20261020')
 report['checks']['sameCoreConceptAndProcedure']=True;report['checks']['distinctPresentation']=True
 report['evidence']['sourceComparison']={'status':'question-only-component-comparison-passed','observations':sourceObservations[q],'sourceHashes':sourceHashes,'sourceReferenceImagesActuallyViewed':q in (9,10),'sourceFigureRole':'reference-only, quarantined, not final authored asset','limits':'실제제공질문/참고그림의수학적대응만검증. 원문답안/해설키는없으며사용하지않았다. 원문대안/전체문서/학기표지/저작권동일성은별도보류. context의printedidentity/coreProposal/gradeApproved플래그를승인오라클로사용하지않았다.'}
 report['evidence']['r3Binding']={'priorReportSha256':h(oldreport),'priorReportCommit':'d5bee0fc79f0074076cb97cac72f45f8415bf7a1','priorRawCommit':'ab41f0db4a50b72762805929db1465cc316a4b21','parentRawSeal':seal['rawCommit'],'candidateStudentAnswerSolutionScoreAssetUnchanged':True,'mathGradeSurfacesReboundUnchanged':True,'noNewBlindOrQuestionCount':True,'currentSourceExposure':'원시Git봉인이후이번r3에서원문질문과참고그림노출. 원시풀이의기존노출선언은그대로보존했다.'}
 report['evidence']['holds']['sourceIdentityApproved']=False;report['evidence']['holds']['wholeSourcePairApproved']=False
 assert report['checks']['unitFamilyFit']==False and report['status']=='pending'
 out=v/f'reports/q{q:02}.json'
 with out.open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'reportSha256':h(out),'trueChecks':sum(report['checks'].values()),'gradeSurfacesPassed':7,'mathGrade':'same-current-raw-rebound','content':'held'})
assert all(h(Path(k))==sha for k,sha in before.items())
with (v/'own-source-comparison-results.json').open('x',encoding='utf-8') as f:json.dump({'results':rows,'contextManifestSha256':h(ctx/'context-manifest.json'),'inputBeforeAfterHashes':before,'sourceMathObservations':sourceObservations,'noOriginalAnswerKeyUsed':True,'noNewQuestionOrBlindCount':True,'r2ReportsAndRawUnchanged':True},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))
