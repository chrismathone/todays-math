from pathlib import Path
from PIL import Image,ImageChops
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-shared-source-ownership-20261020-r2');load=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();m=load(p/'input-manifest.json')
f=p/'own-crop-r3-utf8-probe.txt';f.write_text('실제 crop 소유·경계 추가검토\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='실제 crop 소유·경계 추가검토\n'
expected={'q15-part1.png':'523893afa9493efaa936b9555d38c77e9f1c69e93f8e36dd31d96e43f1da7bec','q15-part2.png':'8cf8e837f7b325f2c6e97ec904f4c2c45240336aa0cc6284966c1ab7957b82ff','q16-part1.png':'ae7b3dae1988f33b4d02b98b0c175d7ba56432dcf4240f4534a5bdfef75a940d'}
inputs={};cropInfo={};stages={}
for name,sha in expected.items():
 f=p/name;assert h(f)==sha;inputs[str(f)]=sha;im=Image.open(f);cropInfo[name]={'sha256':sha,'size':list(im.size),'actuallyViewed':True,'notFinalTwinAsset':True}
for ref in m['originalReferences']:
 f=p/ref['copy'];assert h(f)==ref['sha256'];inputs[str(f)]=h(f)
for q in m['questions']:
 for kind in ['stage','review']:
  f=Path(q[kind]['path']);assert h(f)==q[kind]['sha256'];inputs[str(f)]=h(f)
 stages[q['n']]=load(Path(q['stage']['path']))
# Provenance image comparison only; never translate pixels to marks or answer lengths.
a=Image.open(p/'q15-part2.png').convert('RGB');b=Image.open(p/'q16-part1.png').convert('RGB');assert a.width==b.width and a.height<b.height
prefixEqual=ImageChops.difference(a,b.crop((0,0,a.width,a.height))).getbbox() is None
# Crop encodings can differ; record exact pixel identity rather than assume it.
assert prefixEqual
stageBindings=[]
for n,s in stages.items():
 for ref in s['sourceFigureReferences']:
  name=Path(ref['crop']['path'].replace('\\','/')).name
  assert name in expected and ref['crop']['sha256']==expected[name]
  stageBindings.append({'question':n,'referenceName':name,'sha256':expected[name],'role':ref['role'],'owner':ref.get('owner'),'bboxAsProvided':ref['crop']['bbox'],'providedCompletedPdfPage':ref['crop']['page'],'providedColumn':ref['crop']['column']})
assert [r['referenceName'] for r in stageBindings if r['question']==15]==['q15-part1.png']
assert any(r['question']==16 and r['referenceName']=='q15-part2.png' and r['owner']=='NB-original-printed-16-17' for r in stageBindings)
assert any(r['question']==17 and r['referenceName']=='q15-part2.png' and r['owner']=='NB-original-printed-16-17' for r in stageBindings)
points=load(p/'own-point-transcription.json')['points'];assert len(points)==20
for n in [16,17]:assert stages[n]['sharedSourceContext']['points']==points
oldProtected={}
oldPaths=subprocess.check_output(['git','ls-tree','-r','--name-only','0b9f171429369fbae4f6a3b17540266b6cfad833','--',p.as_posix()],text=True).splitlines()
for name in oldPaths:
 f=Path(name)
 if not f.name.startswith('own-'):continue
 expectedOld=hashlib.sha256(subprocess.check_output(['git','show','0b9f171429369fbae4f6a3b17540266b6cfad833:'+name])).hexdigest();assert h(f)==expectedOld;oldProtected[name]=expectedOld
report={'kind':'independent-actual-crop-ownership-addendum/v3','scope':'Only resolve actual completed-crop content/boundary unknown from preserved r2; no new item or answer','status':'specific-actual-crop-unknown-resolved','priorReport':{'commit':'0b9f171429369fbae4f6a3b17540266b6cfad833','path':'own-source-ownership-review-r2.json','sha256':h(p/'own-source-ownership-review-r2.json'),'bytesPreserved':True},'executableSha256':h(Path(__file__)),'inputHashesBeforeAfter':inputs,'actualCropInfo':cropInfo,'currentStageReferenceChecks':stageBindings,'observed':{'q15-part1.png':['실제view에서15번호·직원월평균소득/지출질문, x축소득(원),y축지출(원), A/B/C/D직원산점도와15의5보기까지있다.','[16~17]머리말·20명점수격자는없다. 두기존원문페이지의오른쪽상단15번지역과내용/라벨/경계가대응한다.'], 'q15-part2.png':['실제view에서[16~17]머리말·학생20명설명과중간x/기말y(점)의격자산점도가보인다.15직원그림/보기는없다.','30~100의10점단위격자에따른20검은점은r2의자체전사및현재16/17staged쌍과같다. 원문페이지중단의공통지역과대응한다.'], 'q16-part1.png':['실제view에서q15-part2의공통머리말/산점도에이어16번호질문과5보기가있다.15의직원자료나17의하단질문은들어있지않다.','상단공통영역은q15-part2와디코딩RGB픽셀까지동일함을비교했다.이것은포함관계/바이트연결증거이며점수/답을픽셀로계산한것이아니다.']},'inferred':{'q15':'현재staged15의단일q15-part1참조는소득/지출고유그림과질문에맞게연결된다.파일명이q15인q15-part2를15의추가그림으로소유시키면안된다.','q16':'현재q16-part1전체와shared-stem참조q15-part2의동시연결은같은공통자료를가리킨다.중복된공통영역은수학적으로새자료가아니며새문항수로세면안된다.','q17':'현재17의owner=NB-original-printed-16-17인q15-part2참조는실제공통머리말/격자파일을정확히가리킨다.파일명의q15가문항소유를의미하지않는다.','boundaryResolution':'r2에서남긴현재단일직원crop범위와공통crop실제파일대응미확인은이세실제파일에한하여해소된다.현재staged원본/참조파일수정은필요없다.'},'unknown': ['직접확인한것은세crop파일과두원문페이지지역의내용/경계이다.원본HWP/PDF바이너리·record stream·xref를새로재파싱한것이아니다.','완료PDF의page/column/bbox숫자는stage메타데이터로기록했고완료PDF원문전체를열어좌표계로재추출한것은아니다.','이addendum은모든페이지·변형원본·답안쌍의동일성,교과/학년/선수수준,권리나최종native자산을인증하지않는다.'], 'exactPrefixPixelCheck':{'q15part2Size':list(a.size),'q16part1Size':list(b.size),'q15part2EqualsQ16TopRegion':prefixEqual,'purpose':'provenance containment only, not numerical math oracle'},'allTwentyPairCheck':{'priorOwnTranscriptionSha256':h(p/'own-point-transcription.json'),'count':20,'stage16Matches':True,'stage17Matches':True,'actualCropsVisuallyConfirmSameLabelsAndPoints':True,'originalQuestionAnswersComputed':False},'rawOriginalTails':{'preserved':True,'q15RawHwpChoiceStillIncludesCommonHeading':'[16~17]' in stages[15]['rawHwpChoices'][-1],'interpretation':'역사적추출꼬리는그대로보존. canonical15보기와공통16/17소유를이미구분했으며원시전사를지우지않음.'},'exposure':{'originalPageHandwrittenMarksPreviouslyVisible':True,'sourceKeyOrAnswerSheetUsed':False,'answerMarksUsedAsEvidence':False,'newTwinsOrAnswers':0},'gates':{'wholePairApproved':False,'sourceIdentityApproved':False,'rightsApproved':False,'gradeApproved':False,'familyApproved':False,'nativeApproved':False,'authoringRelease':False,'operationalRelease':False,'loadable':False,'directUseAllowed':False},'stagingBooleanInterpretation':'generic false는specificcrop판단을전역차단하거나운영허용으로전환하지않는다.이번결론은실제crop소유범위한정.','oldR2TrackedFilesGitHashBinding':oldProtected,'newQuestionCount':0,'dbWrites':0,'inputWrites':0}
out=p/'own-crop-ownership-addendum-r3.json'
with out.open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
for name,sha in inputs.items():assert h(Path(name))==sha
for name,sha in oldProtected.items():assert h(Path(name))==sha
with (p/'own-crop-r3-hash-checks.json').open('x',encoding='utf-8') as f:json.dump({'inputHashesBeforeAfter':inputs,'oldR2TrackedFilesUnchanged':oldProtected,'actualCropsMatchStage':True,'commonImageExactPrefixMatch':prefixEqual,'reportSha256':h(out),'scriptSha256':h(Path(__file__)),'inputAndOldEvidenceUnchanged':True,'stagedSourceImages':False},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'reportSha256':h(out),'commonCropPrefixPixelEqual':prefixEqual,'oldR2FilesPreserved':len(oldProtected)}))
