"""Record the author's actual seven-surface and image inspection, never an independent review."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import hashlib,json,datetime,subprocess
ROOT=Path(__file__).resolve().parent;REPO=ROOT.parents[2]
assert not (ROOT/'author-freeze.json').exists(),'Already frozen.'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
AUTHOR='orca-codex-exam-twin-author-geometry-20261008'
UTC=datetime.datetime.now(datetime.timezone.utc).isoformat()
source=read(ROOT/'evidence/source-final/questions.json');curr=read(ROOT/'evidence/reference-snapshots/curriculum-evidence.json')
codes={c['code']:c for c in curr['achievement_standards']}
layout=read(ROOT/'checks/preview-layout.json');strict=read(ROOT/'checks/strict-render.json')
assert len(layout['results'])==18 and not layout['networkRequests'];assert len(strict['results'])==9
method={
1:'누락 범주의 도수는 총인원에서 알려진 네 도수합을 빼서 구한다. 범주 이름을 최빈값으로 고르며 누락 막대/답 도수는 학생 그림에 없다.',
2:'홀수 자료의 셋째 위치와 짝수 자료의 가운데 두 값으로 a의 범위를 정한 뒤 일차식으로 복구한다. 합친 자료에서는 같은 값도 모두 센다.',
3:'홀수 중앙값은 실제 변량이라는 점과 a<b로 배치를 제한한다. 짝수 중앙값의 정의로 두 자연수 자체를 복구한다.',
4:'평균×개수로 전후 총합을 구하고 추가된 자료합을 역산한다. 원자료 일곱 개가 유일할 필요는 없고 누락 추가값은 유일하다.',
5:'네 편차를 직접 비교하여 이동 전후에 각각 같음을 설명한다. 평균만 역으로 이동하며 표준편차는 정의로 보존한다.',
6:'세 새 편차가 각각 원래 편차의 k배임을 전개한다. 제곱의 평균과 표준편차의 제곱으로 k²=9를 얻고 양수 조건을 적용한다.',
7:'아홉 자료의 다섯째 위치를 개수로 제한하고 네 빈칸에 같은 정수를 넣어 구간의 모든 값이 가능함을 보인다. 순서통계량/최적화 정리를 도입하지 않는다.',
8:'각 (xi−6)²를 전개하여 실제 여덟 항을 더한다. 평균에서 합을 구한 뒤 편차제곱의 평균을 계산한다. 일반 모멘트/기대값 공식으로 처리하지 않는다.',
9:'새 12개 구성점에서 두 축 모두 50 이상인 점을 경계 포함하여 센 뒤 전체에서 뺀다. 원문 15개 관측점은 별도 증거에 그대로 남긴다.',
10:'주어진 유한 세 변에서 두 각의 대변/이웃변/빗변을 각각 식별한다. 기록값에 맞는 삼각비 이름을 찾으며 임의각 관계식은 쓰지 않는다.',
11:'윗면 정사각형 대각선에 피타고라스를 쓰고, 명시된 실제 직각삼각형 BFD에서 다시 피타고라스와 cos 정의를 쓴다. 투시도 각도나 공간 벡터를 계산하지 않는다.',
12:'tan 정의로 두 양의 직각변을 t,2t로 놓는다. 주어진 빗변에 피타고라스를 적용하고 길이의 양의 제곱근을 선택한다.',
13:'두 예각 위치에서 동일 종류의 높이/수평거리/고정 밑변에 대한 교점 높이를 비교한다. 서로 다른 삼각비 사이 관계식이나 sin·cos·tan의 교차 대소는 사용하지 않는다.',
14:'60도와 45도의 각각 알려진 간단한 값만 대입한다. 근호의 곱/합과 일차식으로 양수 계수를 역산한다. 삼각비 사이 항등식을 유도하지 않는다.',
16:'부분 도수와 알려진 평균으로 누락 시간을 복구한다. 정렬하여 중앙값을 구하고 한 극단값 때문에 평균이 대부분의 자료를 잘 대표하지 못함을 설명한다.',
17:'기준 학생을 뺀 기록의 평균은 1이다. 실제 평균과 비교해 기준 학생의 개수를 역산하며 실제 편차=차 기록−1임을 직접 설명한다. 두 소문항을 각각 채점한다.',
18:'제시된 D만 사용한다. 45도 직각삼각형의 두 직각변과 피타고라스, AD=CD, 길이합으로 BC를 복구한다. 일직선 각과 이등변 밑각으로 특정 22.5도를 확인하고 실제 변비를 유리화한다.',
19:'실제 60도 직각삼각형 OAC/OBD의 길이를 r로 적고 AC∥BD인 사다리꼴의 두 평행변과 높이로 넓이를 세운다. 주어진 넓이에서 양의 반지름만 복구한다.'}
visual={
1:'네 알려진 범주만 그렸고 만화 답 막대는 없다. 도수 8/5/4/3, 0~10 눈금, 명 단위, 다섯 선택지가 선명하다.',
2:'홀수/짝수 자료와 중앙값 표, 11개 자료 설명, 자연수 조건 및 새 해설을 70mm에서 확인했다.',
3:'a<b 조건과 두 중앙값 표, 순서 있는 두 수 선택지, 불가능 배치 설명이 잘리지 않는다.',
4:'전후 개수/평균 표의 열이 구분되고 두 알려진 추가값과 누락 m의 기록이 선명하다.',
5:'이동 후와 원래 자료의 두 행, 두 가림 기호, 표준편차 단위 없는 수치 기록과 편차 풀이가 읽힌다.',
6:'k>0에 해당하는 양수 문구, 변량 세 개 및 5개 순서쌍 선택지와 새 편차식이 읽힌다.',
7:'다섯 고정값의 도수 합과 네 빈칸, 경계 포함 문구, 범위 선택지가 구분되고 존재 논증이 잘리지 않는다.',
8:'제곱합 320과 평균 6, 분산/표준편차 순서가 명확하다. 긴 편차제곱 전개는 줄바꿈되어 70mm 열 밖으로 나가지 않는다.',
9:'수정 후 0~80의 10점 눈금과 12개 점이 분리되어 보인다. 읽기/쓰기 축의 뜻과 점 단위는 바로 앞 본문에 명시했다. 축 의미, 범위, 점, 경계 조건을 삭제하지 않았다.',
10:'P/Q/R 세 점과 R 직각 표시, 본문의 세 변 길이와 두 각의 이름 기록이 모두 읽힌다. 수치 조건은 본문에 있고 그림은 각/변 역할을 보여준다.',
11:'각각 55mm에서 투시도 8개 꼭짓점과 숨은 모서리 점선, BFD 선분을 확인했다. 별도 실제 단면의 B 직각 및 F의 θ가 읽힌다. 투시도에는 잘못된 직각 표시가 없다.',
12:'P/Q/R와 R 직각 표시, 주어진 빗변/tan 및 양의 두 변 선택지가 선명하며 본문 조건을 그림에서 추정할 필요가 없다.',
13:'O/A/B/P/Q/H/K/T/U가 모두 보이고 P/H와 Q/K 수선, 세 직각 표시와 A 수직선의 두 교점이 구분된다. 세 종류 길이 표가 70mm 열에 들어간다.',
14:'특수각 네 항과 계수 k 및 등호 오른쪽 5√2/4가 한 수식 기록으로 읽힌다. 수식 넘침이 없다.',
16:'알려진 9명의 도수표와 총 10명 평균, 누락 시간/대표값/이유 요구가 선명하다. 새 해설의 정렬 10개 값과 분 단위가 보인다.',
17:'차 기록의 세로 표와 기준 학생 지우 행 0, 실제 평균 9개, ⑴/⑵ 각 5점이 모두 보인다. 새 해설의 기준값과 표준편차 단위가 읽힌다.',
18:'D가 A와 B 사이에 있고 AD/CD 같은 눈금, B 직각, D의 45도 호가 겹치지 않는다. AB만 주어진 역산 조건, 세 답과 완결된 각 확인/유리화 풀이가 읽힌다.',
19:'사분원 호와 O/A/B/C/D, 60도, C/B 직각 표시 및 ACBD 전체 사다리꼴 음영이 읽힌다. 원호를 경계로 잘라낸 넓이가 아니며 반직선 교점 조건이 본문에 있다.'}
risk={
2:'평균까지 요구한 한 단계 추가가 4점과 원문 중앙값 절차의 목표 난도에 맞는지는 독립 난도 검토가 남는다.',
6:'일반 k를 넣어도 새 편차 세 개의 다항식 전개와 양의 제곱근만 필요하다. 통계 변환 공식을 외워 쓰게 하지 않는지 독립 7면 검토가 남는다.',
7:'최댓값에서 전체 구간/존재로 바꿨으므로 경계 및 존재 논증의 5점 적정성은 독립 검토가 남는다.',
8:'현재 저장소 m3Stat2의 주석은 일반 제곱합-평균² 통계 공식을 고1로 경고한다. 새 풀이에서는 여덟 편차 제곱을 각각 전개한다. 이 구체적 다항식 전개와 중3 분산 정의의 결합이 허용되는지는 독립 교육과정 검토 대상이며 일반 공식의 학년 승인으로 확대하지 않는다.',
11:'실제 직각 단면을 제공하여 공간 작도를 없앴다. 실제 registry07은 정수 대각선 직육면체/심화하이다. 새 정육면체 무리수와 두 기록의 응용 제안은 원문 학교/기존 key 승인에 기대지 않는다.',
13:'같은 함수의 각도 변화에 해당하는 세 실제 길이 변화만 비교한다. 공식 금지의 교차 삼각비 관계와 구분한 전체면 독립 검토가 남는다.',
18:'특정 22.5도는 제시된 이등변삼각형의 밑각이며 tan은 실제 변비이다. 반각/덧셈정리/일반항등식을 쓰지 않는다. 전체 복합 절차의 중3 정당성과 12점 난도는 독립 검토가 남는다.',
19:'한 사다리꼴과 두 60도 직각삼각형만 쓴다. 대각선 곱 sin 넓이 공식/원비례/섹터 공식은 없다. 전체 측정 복잡도와 10점은 독립 검토가 남는다.'}
rows=[]
for item in layout['results']:
 n=item['questionNumber'];q=f'q{n:02}';c=read(ROOT/'candidates'/q/(q+'.json'));check=read(ROOT/'checks'/(q+'.json'))
 assert check['candidateFileSha256']==sha(ROOT/'candidates'/q/(q+'.json'))
 assert not item['mathOverflow'] and not item['validation']['surfaceKeywordViolations']
 standards=[dict(code=k,text=codes[k]['verified_text'],locator=codes[k].get('original_2015_pdf_locator')) for k in c['curriculumReview']['standardCodes']]
 body=dict(stem=dict(status='author-proposed',evidence=c['variantDelta']['after'],conditions=c['facts']['givens']),choices=dict(status='author-proposed',evidence=check['choices']),figuresAndTables=dict(status='author-proposed',evidence=visual[n],figureBindings=check['assets'],rawSourceDataPreservedSeparately=True),notation=dict(status='author-proposed',evidence='예각/도 단위, 유한 변비, 편차/정렬/다항식/근호 표기만 사용. 학생면에 벡터·라디안·일반 삼각함수·시그마·고급 통계 기호 없음.'),answer=dict(status='author-proposed',evidence='새 정확 답과 실제 선택지 대응/길이 양수/단위/소문항을 저자 계산으로 확인',authorCheckPath=f'checks/{q}.json',authorCheckSha256=sha(ROOT/'checks'/(q+'.json'))),studentSolution=dict(status='author-proposed',evidence=method[n],completeNewSolution=True),prerequisites=dict(status='author-proposed',evidence=standards))
 rows.append(dict(questionNumber=n,twinExternalId=c['twinExternalId'],authorId=AUTHOR,method='author-recomputation-and-actual-local-image-inspection',independentVerification=False,finalGradeApproval=False,status='author-proposed',candidateFileSha256=sha(ROOT/'candidates'/q/(q+'.json')),curriculumSurfaces=body,conceptProcedureAssessment=dict(status='author-proposed',sharedConcept=c['variantDelta']['sharedConcept'],sharedProcedure=method[n],substantiveDelta=c['variantDelta'],notNumberOrNameOnly=True),naturalKoreanAssessment=dict(status='author-proposed',evidence=visual[n],realSchoolInternalOnly=True,fictionalSchoolAlias=c['metadata']['studentSchoolAlias']),scoreDifficultyAssessment=dict(status='author-proposed',referenceScore=c['sourceReference']['originalReferenceScore'],newScore=c['score'],difficultyProposal=c['metadata']['difficultyProposal'],format=c['questionType'],newRubric=c['facts']['authorRubric'],subQuestions=c['facts']['subQuestions'],basis='원문 배점은 부모 문항마다 한 번 유지한다. 새 역산/표/제시도형의 절차를 구체적으로 열거하며 난도는 독립 판단을 기다린다.'),materialIndependentChecksRemaining=risk.get(n,'학생 7면/신구 핵심 절차/난도/유사성의 독립 판단을 기다린다.'),visualInspection=dict(inspection='author personally viewed actual final qa/qNN-author.png via view_image; contains all student stem/options/figures and new complete solution',columnWidthMm=70,figureWidthsMm=item['figureWidthsMm'],authorPreviewPath=item['authorPng'],authorPreviewSha256=sha(ROOT/item['authorPng']),studentPreviewPath=item['studentPng'],studentPreviewSha256=sha(ROOT/item['studentPng']),observations=visual[n],resolved=True,remainingVisualDefects=[]),unitProposal=c['metadata']['assignment']['unitId'],familyKey=None,loadable=False,directUseAllowed=False))
assert set(r['questionNumber'] for r in rows)==set(range(1,20))-{15}
put(ROOT/'checks/author-seven-surface-review.json',dict(authorId=AUTHOR,recordedAtUtc=UTC,method='author-only inspection; no independent solver/verifier',parents=18,leaves=19,finalGradeApprovals=0,independentApprovals=0,allSevenSurfacesConsidered=True,results=rows))
put(ROOT/'checks/visual-review.json',dict(authorId=AUTHOR,recordedAtUtc=UTC,independentVerification=False,questionsPersonallyInspected=18,strictNativeSvgsPersonallyInspected=9,columnWidthMm=70,maximumFigureWidthMm=70,actualViews=[r['visualInspection']|{'questionNumber':r['questionNumber']} for r in rows],defectsResolved=[dict(questionNumber=1,defect='Initial native barChart spec used wrong values shape',repair='Use native catalog label/value object records. strict render succeeded; no fallback/manual SVG.'),dict(questionNumber=9,defect='Long native axis labels left too narrow a plot and adjacent ticks crowded at70mm',repair='Put both axis meanings and point units explicitly in immediately preceding student stem; native plot retains all12points,0..80ticks,10step and50boundary. Final actual preview personally viewed.')],unresolvedVisualDefects=[],gradeApproval=False))
rendererFiles=['src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts','src/lib/figure/mathjaxLabel.ts','scripts/figure/render_spec.py','scripts/figure/engine_path.py','scripts/figure/elementary.py','scripts/figure/elem_advanced.py']
rendererFiles=[x for x in rendererFiles if (REPO/x).is_file()]
rendererFiles+=sorted(str(p.relative_to(REPO)).replace('\\','/') for p in (REPO/'vendor/figure-engine').rglob('*.py'))
engines=[dict(repositoryPath=p,sha256=sha(REPO/p)) for p in rendererFiles if '__pycache__' not in p]
put(ROOT/'evidence/figure-generation.json',dict(authorId=AUTHOR,method='existing renderFigureSpec; native vectors only',strict=True,typeset=True,local=True,modelOrPaidApiCalls=0,sourceCropFinalArtCount=0,renderScriptPath='render.mts',renderScriptSha256=sha(ROOT/'render.mts'),engineInputs=engines,strictRenderPath='checks/strict-render.json',strictRenderSha256=sha(ROOT/'checks/strict-render.json'),jobs=strict['results']))
for j in strict['results']:
 assert j['ok'] and j['strict'] and j['local'] and not j['droppedDimensions']
 assert sha(ROOT/j['spec'])==j['specSha256'] and sha(ROOT/j['svg'])==j['svgSha256']
base=read(ROOT/'evidence/preservation-baseline.json');preserved=[]
for r in base['files']:
 actual=sha(REPO/r['path']);assert actual==r['sha256'],'Protected file changed: '+r['path'];preserved.append(r|{'currentSha256':actual,'unchanged':True})
receipt=read(ROOT/'evidence/source-copy-receipt.json');checked=[]
for r in receipt['entries']:
 assert sha(ROOT/r['path'])==r['sha256']
 assert sha(Path(r['parentPath']))==r['sha256'],'Root frozen safe source drift'
 checked.append(r|{'ownedCopyMatches':True,'parentMatchesAtRecheck':True})
put(ROOT/'checks/preservation.json',dict(recordedAtUtc=UTC,priorCommit=base['priorCommit'],sealedGyeongguFiles=247,priorOwnedFiles=75,protectedCount=322,unchangedCount=322,actualByteComparison=True,files=preserved,sourceSafePacketFiles=checked,parentSourceWrites=0))
parent=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
addendum=parent/'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-4.md'
put(ROOT/'evidence/resume-instruction-read.json',dict(recordedAtUtc=UTC,latestAgentRulesPath='D:/todays-math/AGENTS.md',latestAgentRulesSha256=sha(Path('D:/todays-math/AGENTS.md')),parentAddendum4Path=str(addendum),parentAddendum4Sha256=sha(addendum),runtimeProbePaths=['runtime-probe-resume.json','runtime-probe-resume-r2.json'],watcherControlsReadOnly=True,rootRuntimeRepairObserved=True,skillAndLiveDocsRead='evidence/instruction-read.json',noNewWorker=True))
print('Actual views18/9, seven surfaces18, exact protected bytes322 and root safe packet21 unchanged; author approvals0.')
