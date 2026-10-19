import pathlib,json,hashlib,copy
p=pathlib.Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q16-primary-grade-addendum-20261019-r3');old=p.parent/'nobyeon-sem1-q16-stage2-review-20261019-r2';raw=p.parent/'nobyeon-sem1-q16-clean-blind-20261019-r2/solve/q16.json'
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def read(q):return json.loads(q.read_text(encoding='utf-8-sig'))
def put(n,v):
 q=p/n;q.parent.mkdir(exist_ok=True)
 with q.open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
loc=read(p/'primary-locators-parent-viewed-r3.json');inputs={q.name:sha(q) for q in [p/'primary-locators-parent-viewed-r3.json']+[p/f'primary-page-{n}.png' for n in [10,34,35]]}
for page in loc['pages']:assert inputs[f"primary-page-{page['pdfPage1based']}.png"]==page['renderSha256']
prior=read(old/'reports/q16.json');assert sha(old/'reports/q16.json')=='9a0d6ab776b47f75aa47d9c7fa755bee4a7e5c63b0da301329981d8dcbbff5a2'
assert sha(raw)=='0f914891fd7a5caa92c35b65ad1ac70286c72cb82361ee98e42f2b6c604eb1f4'
oldinputs=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q16-only.json','official-locators-reference.json','candidate-figure.spec.json','candidate-figure.svg']
before={n:sha(old/n) for n in oldinputs};assert before['verification-inputs.json']==read(old/'verification-manifest.json')['verificationInputsSha256']
obs={'scope':'grade evidence addendum only; not fresh blind; no new math/question approval count','independentVisualRead':[{'pdfPage1based':10,'printedPage':'3','observation':'본문 첫 문단이 2015 개정 교육과정의 초·중학교 수학과 교육과정을 설명함.'},{'pdfPage1based':34,'printedPage':'27','observation':'소인수분해 단원 개관에 중학교 1학년 자연수의 소인수분해 학습을 명시. 성취기준 연계표의 중학교 1학년 열에 [9수01-01]과 [9수01-02]가 배치됨.'},{'pdfPage1based':35,'printedPage':'28','observation':'지도계통의 중1학년 열에서 소인수분해 아래 소수·합성수·거듭제곱·소인수 개념을 배움. 아래 중등 연계 설명도 소수·합성수를 새 학습 요소로 구분함.'}],'documentProvenance':{'officialUrl':loc['url'],'actualIndependentStreamHash':'d7e451601e46c72656719f2cb1c50fd1788f26055dbc9b9d931336e054d16f28','actualBytes':62389235,'responseContentType':'application/pdf','hashMatchesLocator':True,'method':'공식 KOSAC CDN URL을 urllib로 직접 열고 65536 byte 청크 단위 SHA256. 전체 PDF를 파일로 저장하지 않음.','imageProvenanceBoundary':'세 PNG의 바이트 해시는 locator와 독립 대조하고 각 이미지 내용을 직접 열어 확인. PDF로부터 동일 PNG를 재렌더링한 것은 아니며 페이지 대응은 제공된 locator와 이미지 인쇄쪽수/연속 문맥에 의존. 이 제한과 별개로 문서 원본 해시는 독립 일치.'},'itemMapping':'q16에서 쓰는 소수의 양의 약수는 1과 자신뿐이라는 기본 성질은 중1 소수 개념의 직접 적용. 23×양의 정수의 소수 여부에 사용하며 고급 정수론이 필요하지 않음. 기존 r2의 초등 넓이·둘레, 중1 방정식, 중3 완전제곱식·제곱의 차 근거와 합쳐 선수학습 후 2015 중3 범위에 적합.','gradeDecision':'2015 중3 2025/2026: after-prerequisites passed; 학교 중간고사 진도 또는 실측 난도 인증 아님. 2027/2022는 별도 실제 배치 근거 미확보로 pending.','remainingHolds':['정확한 mixed live-family 의미/목표 적합성','소수 prerequisite Unit UUID','source identity','rights','similarity','native provenance','loadability'],'priorPendingPreserved':True,'noNewMathQuestionCount':True,'fullPdfOrImagesCommitted':False}
put('own-q16-primary-grade-evidence.json',obs)
r=copy.deepcopy(prior);r['verifierId']='codex-independent-q16-primary-grade-addendum-r3-20261019';r['checks']['curriculumAppropriate']=True;r['checks']['allStudentSurfacesInScope']=True
r['curriculumSurfaces']['prerequisites']={'status':'passed','reason':'새로 직접 확인한 공식 2015 자료 인쇄 27~28쪽의 중1 소인수분해/소수·합성수 실제 배치와 기존 초등 넓이·둘레/중1 방정식/중3 인수분해 근거를 결합. 실제 선수학습 후만 배정. UUID 미확인은 metadata binding hold로 별도 유지.'}
e=r['evidence'];e['priorReport']={'path':'../nobyeon-sem1-q16-stage2-review-20261019-r2/reports/q16.json','sha256':sha(old/'reports/q16.json'),'preserved':True};e['gradeAddendum']='own-q16-primary-grade-evidence.json';e['gradeApproved2015M3']=True;e['gradeStatus']='passed-after-prerequisites-2015-M3-2025-2026';e.pop('gradeHold',None);e['gradeDecision']='2015 중3 인수분해와 이전 학년 소수·양의 변·넓이·둘레·합차/방정식 절차로 해결. 인쇄 27/28쪽의 실제 중1 소수 배치로 r2 보류 사유 해소. 2022 중3은 pending.'
for k in ['calculations','figure','primary']:e[k]='../nobyeon-sem1-q16-stage2-review-20261019-r2/'+prior['evidence'][k]
e['noNewMathQuestionCount']=True;e['gradeEvidenceOnly']=True
assert r['status']=='pending' and not r['checks']['unitFamilyFit'];assert sum(r['checks'].values())==11
put('reports/q16.json',r)
assert before=={n:sha(old/n) for n in oldinputs};assert sha(old/'reports/q16.json')==e['priorReport']['sha256'];assert sha(raw)==e['rawSha256']
put('own-q16-addendum-hashes.json',{'newInputs':inputs,'priorInputs':before,'priorReportSha256':sha(old/'reports/q16.json'),'rawSha256':sha(raw),'inputsRawPriorReportUnchanged':True,'newReportSha256':sha(p/'reports/q16.json'),'evidenceSha256':sha(p/'own-q16-primary-grade-evidence.json'),'counts':{'newQuestions':0,'newMathApprovals':0,'gradeHoldResolved':1,'currentMathApproved':1,'currentGradeApproved2015':1,'currentHeld':1,'checksPassed':11,'checksHeld':1,'surfacesPassed':7}})
print('report '+sha(p/'reports/q16.json'));print('hash-list '+sha(p/'own-q16-addendum-hashes.json'))
