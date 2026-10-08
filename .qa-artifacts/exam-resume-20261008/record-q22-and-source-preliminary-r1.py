import json,pathlib,hashlib,datetime
base=pathlib.Path('.qa-artifacts/exam-resume-20261008')
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def write(p,data):
 with pathlib.Path(p).open('x',encoding='utf-8') as file:file.write(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
repair=base/'gyeongsan-q22-repair-r2'
write(repair/'visual-inspection.json',{'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidateSha256':sha(repair/'candidate.json'),'expandedSolutionPreview':{'path':str(repair/'review-preview/q22.solution.png'),'sha256':sha(repair/'review-preview/q22.solution.png'),'viewed':True},'inspection':'All statement/5fractions/correct mark/new student reasoning and alpha/beta/right-angle/point labels visible at local70mm bank-cap; no overflow reported.','strictEngineFigureRecreated':True,'pixelsUsedForCalculation':False,'independentVerification':False,'fullGradeApproval':False,'nativeReaderAndPhysicalPrintApproved':False,'nextStep':'Different solver after current Gyeongsang15 authoring seals: fresh blind q22-r2, then new full review; oldr1 proof never substitutes.'})
attempt=base/'next-three-extraction-r1-attempt2'
views={}
for slug,names in {'gyeongilyeo':['original-01-first-page.png','completed-page-01.png'],'gyeseong':['original-01-first-page.png','original-02-first-page.png','original-03-first-page.png','completed-page-01.png'],'nobyeon':['original-01-first-page.png','completed-page-01.png']}.items():
 views[slug]=[{'path':str(attempt/slug/'reviewer-only'/name),'sha256':sha(attempt/slug/'reviewer-only'/name),'viewed':True} for name in names]
write(attempt/'preliminary-printed-identity-review-r1.json',{
 'kind':'preliminary-printed-source-identity-review/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reviewer':'root-codex-exam-extraction-resume-20261008','actualNewParsedParents':67,'newQuestionComponentApprovals':0,'newTwinApprovals':0,'dbWrites':0,'authorDistributionAllowed':False,
 'originalAnswerExposureDisclosure':'Some original scan pages contain handwriting/circled answers; Gyeseong original01 is an answer/score sheet. Incidentally viewed only for source identity, not used for new answers or mathematical approval. Retained reviewer-only, not a student/author packet.',
 'legacyExportFlagClarification':'originalAnswersExported=false in raw manifest refers to completed-PDF extraction without with_answers. An original answer-sheet image/text was captured as reviewer-only evidence. The literal manifest is preserved and this scope clarification corrects any broader interpretation.',
 'cases':[
  {'slug':'gyeongilyeo','viewed':views['gyeongilyeo'],'printedOriginal':'2025학년도3학년1학기중간고사; first-page school name not established','completed':'2025년2학기중간 KI여중3학년; footer26년2학기대비 is not examyear','parsedSourceScoreSum':96,'status':'hold_school_semester_and_score','requires':'Actual remaining original pages/printed school/term and per-question score comparison; do not invent100 or fix1→2 as a presumed typo.'},
  {'slug':'gyeseong','viewed':views['gyeseong'],'printedOriginal02And03':'계성중학교 copyright, 2025년9월25일2교시,3학년2학기중간,23=18MC+5written,65+35=100','original01':'First page answer/score sheet; exclude from author whitelist, use original02/03 question pages for source identity','status':'first_page_identity_supported_whole_content_and_pair_pending'},
  {'slug':'nobyeon','viewed':views['nobyeon'],'printedOriginal01':'노변중 footer,2025년9월25일3교시,3학년2학기중간,17MC+5written22','status':'first_page_identity_supported_whole_content_and_duplicate_originals_pending'},
 ],
 'wholeSourceAndCurriculumReviewAssigned':'Original algebra Codex session01a1177d-e52b-7511-944f-c2d4edd47c82; requestde54ea06-0d75-4b32-9f43-03395d73f60a turn_started. New next-three-source-review-r1 scope.',
 'rightsSimilarityCurriculumNative':'All held; first-page observation/count matching never approves a whole exam or item.',
})
print(json.dumps({'q22ActualExpandedViewBound':True,'sourceFirstPagesViewed':8,'actualParsedParents':67,'sourceComponentApprovals':0,'newTwinApprovals':0}))
