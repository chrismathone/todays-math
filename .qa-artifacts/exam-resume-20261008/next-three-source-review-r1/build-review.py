"""Build bounded source-only evidence. Never load answer/solution/private files.
The initial custody audit was executed with N: available. Finalization rechecks
the retained manifests/crops/previews and explicitly records unavailable N: paths.
"""
import collections, datetime, hashlib, json, pathlib, re, shutil, sys
from PIL import Image
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parent
WORKTREE=ROOT.parents[2]
PARENT=pathlib.Path(r'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008')
SOURCE=PARENT/'next-three-extraction-r1-attempt2'
VERIFIER='orca-codex-exam-twin-author-algebra-20261008'
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(v):return sha(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8'))
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def bound(p):return {'path':str(p),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size}
observations=read(ROOT/'item-observations.json')
audit=read(ROOT/'custody-record-audit.json')
previews=read(ROOT/'preview-bindings.json')
curriculum_path=WORKTREE/'.qa-artifacts/exam-resume-20261008/curriculum-evidence.json'
curriculum=read(curriculum_path)
bank_path=PARENT/'bank-read-fresh-r3-20261008.json';bank=read(bank_path)
registry_path=PARENT/'registry-read-20261008.json'
unit_sections={'value':'삼각비의 값','definition':'삼각비의 뜻','application':'삼각비의 활용','chord':'원과 현','tangent':'원의 접선','inscribed':'원주각','statistics':'대푯값과 산포도','scatter':'산점도와 상관관계'}
units={u['section']:u for u in bank['units']}
gates={'sourceIdentityApproval':False,'wholePairApproval':False,'gradeApproval':False,'familyApproval':False,'difficultyApproval':False,'rightsApproval':False,'custodyApproval':False,'nativeApproval':False,'loadable':False,'directUseAllowed':False}
original_scores={'gyeongilyeo':[3]*5+[4]*10+[5]*2+[6,7,7,7,8], 'gyeseong':[3]*7+[4]*11+[6,7,7,7,8], 'nobyeon':[3,4,4,5,4,4,5,4,5,5,4,3,4,3,4,4,5,4,5,5,5,11]}
points=[(30,30),(40,50),(40,60),(50,40),(50,60),(50,80),(60,50),(60,60),(60,70),(60,80),(70,50),(70,60),(70,70),(70,90),(80,50),(80,70),(80,90),(80,100),(90,70),(90,100)]
assert len(points)==20 and len(set(points))==20
ranked=sorted([x+y for x,y in points],reverse=True)
shared={'id':'NB-original-printed-16-17','questionNumbers':[16,17], 'content':'[16~17] 그림은 학생 20명의 중간고사와 기말고사의 국어 점수를 조사하여 나타낸 산점도이다. 물음에 답하시오.', 'axes':{'x':'중간고사(점)','y':'기말고사(점)'},'points':points,'pointCount':20,'gradeProposalCodes':['9수05-08'],'notAnAnswer':True}
shared['contentDigest']=digest(shared)
manifest_bindings=[];reviews=[];whitelist=[];school_reviews=[]
for school in ['gyeongilyeo','gyeseong','nobyeon']:
    mp=SOURCE/school/'source-manifest.json';m=read(mp);selected=read(SOURCE/school/'selected-source-inputs.json')
    old=next(x for x in audit['schools'] if x['schoolKey']==school)
    assert sha(mp.read_bytes())==old['manifestSha256']
    assert len(m['questions'])==len(observations[school])==len(original_scores[school])
    manifest_bindings.append(bound(mp))
    write(ROOT/'evidence'/f'{school}-selected-source-inputs.json',selected)
    totals={'printedQuestionScoresObserved':original_scores[school],'printedParentScoreSumCalculated':sum(original_scores[school]),'completedParentScoreSumCalculated':sum(q['printedScoreOccurrences'][0]['value'] for q in m['questions']),'missingParentScoreQuestions':[], 'ambiguousPerSubpartAllocation':[], 'scoreApproval':False}
    if school=='gyeongilyeo':
        identity={'printedYear':2025,'printedGrade':3,'printedSemester':1,'printedRound':'중간고사','printedSchool':None,'nominalCompletedSemester':2,'status':'held-printed-term-conflict-school-unbound','basis':'All four original footers print 2025학년도 3학년 1학기 중간고사, 수학 code02,4쪽. No printed school name found on any supplied original page. Filename/completed header cannot resolve this.'}
        totals.update({'priorRootReportedRawScoreSum':96,'conflict':'Prior 96 remains an unresolved competing observation. Direct item-by-item printed scores read as 100; no 100 total is printed on supplied original. No invented four-point adjustment or source certification.','parentSubparts':{'20':{'parent':7,'parts':[4,3],'countParentOnce':True}}})
        totals['ambiguousPerSubpartAllocation']=[18,19,21,22]
    elif school=='gyeseong':
        identity={'printedYear':2025,'printedGrade':3,'printedSemester':2,'printedRound':'중간고사','printedSchool':'계성중학교','printedDate':'2025-09-25','printedPeriod':2,'status':'printed-identity-observed-not-whole-pair-certified','basis':'Original02/03 page1: header/date/code04,23=18MC+5written; copyright notice names 계성중학교. Printed total100=65+35,4pages. Manuscript school/name not relied on.'}
        totals.update({'printedExamTotal':100,'printedMcTotal':65,'printedWrittenTotal':35,'reviewerOnlyOriginals':[1]});totals['ambiguousPerSubpartAllocation']=list(range(19,24))
    else:
        identity={'printedYear':2025,'printedGrade':3,'printedSemester':2,'printedRound':'중간고사','printedSchool':'노변중학교','printedDate':'2025-09-25','printedPeriod':3,'status':'printed-identity-observed-not-whole-pair-certified','basis':'Original02/03/04 printed cover names 노변중학교 and6pages=cover+5questionpages. Other alternatives omit cover but printed footer/last copyright join school.17MC+5written22.'}
        totals.update({'printedExamTotal':None,'mcScoreSumCalculated':sum(original_scores[school][:17]),'writtenScoreSumCalculated':sum(original_scores[school][17:])});totals['ambiguousPerSubpartAllocation']=list(range(18,23))
    alternatives=[]
    for n,src in enumerate(selected['originalReferences'],1):
        pp=[p for p in previews if p['school']==school and p['alternative']==n]
        for p in pp:assert sha((ROOT/p['path']).read_bytes())==p['sha256']
        if school=='gyeongilyeo':page_roles={'1':'questions1-7','2':'questions8-13','3':'questions14-18','4':'questions19-22'}
        elif school=='gyeseong' and n==1:page_roles={'1':'answer-sheet-reviewer-only-not-used','2':'blank','3':'questions1-7','4':'questions8-14-upside-down','5':'questions20-23-upside-down','6':'questions15-19'}
        elif school=='gyeseong':page_roles={'1':'questions1-7','2':'questions8-14','3':'questions15-19','4':'questions20-23'}
        elif n in [2,3,4]:page_roles={'1':'cover-identity-copyright-only','2':'questions1-5','3':'questions6-11','4':'questions12-17','5':'questions18-21','6':'question22'}
        else:page_roles={'1':'questions1-5-printed-page2','2':'questions6-11-printed-page3','3':'questions12-17-printed-page4','4':'questions18-21-printed-page5','5':'question22-printed-page6'}
        alt={'alternative':n,'source':src,'pageCount':len(pp),'pageRoles':page_roles,'viewed':'direct visual unique pages; byte/pixel-identical duplicate pages inherited only after exact code comparison','questionContentComparison':'Same printed item conditions/math/options/figures/tables/scores within this school; incidental manuscript layers differ. KI10 option-label sequence disagreement is with completed pair, not a key comparison.','authorDistributionAllowed':False,'reviewerOnly':True,'previewBindings':pp}
        if school=='gyeseong' and n==1:alt['restriction']='Entire answer-sheet-containing PDF excluded from author inputs, including its question pages. Keys were not transcribed, compared, solved against, or used for approval.'
        alternatives.append(alt)
    sr={'schoolKey':school,'verifierId':VERIFIER,'method':'independent-source-component-comparison','manifestBinding':bound(mp),'selectedInputBinding':bound(SOURCE/school/'selected-source-inputs.json'),'identity':identity,'counts':{'newlyParsedParents':len(m['questions']),'originalPrintedParentsObserved':len(m['questions']),'identitySupportedPrintedParents':0 if school=='gyeongilyeo' else len(m['questions']),'formalSourceCertifiedParents':0,'newTwins':0,'gradeApprovals':0,'rightsApprovals':0,'familyApprovals':0,'nativeApprovals':0},'scores':totals,'originalAlternatives':alternatives,'originalAlternativeDedup':{'byteIdenticalGroups':[[1,6],[2,3]] if school=='nobyeon' else [],'pixelIdenticalQuestionPageGroups':{'2/3/4':'pages2-6 identical at saved render dimensions;4cover has manuscript personal data'} if school=='nobyeon' else {},'semanticQuestionContentGroups':[list(range(1,len(alternatives)+1))],'crossSchoolExamDedupCertified':False,'currentBankDedupPerformed':False},'completedPairHeaderFooterCaveat':'Completed PDF nominal2025secondsemester and HWP preparation footer26년2학기 are not original identity evidence.','originalAnswersUsed':False,'gates':gates}
    write(ROOT/'schools'/f'{school}.json',sr);school_reviews.append(sr)
    for q,obs,printed_score in zip(m['questions'],observations[school],original_scores[school]):
        n=q['number'];core,procedure,unit_key,codes,status,facts=obs
        standards=[('9수'+c if c.startswith('05-') else '9수04-'+c) for c in codes.split(',')]
        if '넓이' in core:standards.append('6수03-06')
        for code in standards:assert any(x['code']==code for x in curriculum['achievement_standards'])
        assert printed_score==q['printedScoreOccurrences'][0]['value']
        oldq=next(x for x in old['questions'] if x['number']==n)
        for crop in q['questionPageCrops']:assert sha((SOURCE/crop['path']).read_bytes())==crop['sha256']
        issues=[];amendments=[]
        stem=q['stem'];choices=list(q['choices']);figures=list(q['figureCorrespondence']);hwp_figures=list(q['hwpFigureRecords'])
        if school=='gyeongilyeo' and n==10:
            issues=['Completed/HWP stem says 점 O while original print says 원 O.','Original option marks in spatial reading order are ①72,②74,④76,⑤78,③80; completed renumbers spatial order ①~⑤. Exact original mark-to-value map differs.']
        if school=='gyeongilyeo' and n==12:issues=['Converted first fraction breaks DE numerator/bar grouping; raw HWP and printed originals/PDF show DE/AE.']
        if school=='gyeongilyeo' and n==14:issues=['Converted target a\\frac{}{b} has missing numerator; original and completed visual target a/b.','B y-intercept is defined in stem but lacks a clear printed figure label; manuscript B is not a source label.']
        if school=='gyeseong' and n==16:issues=['Manifest figureCorrespondence empty although original/completed question visibly contains folded paper figure and HWP BIN000E record. Preserve rendered ownership; no guessed xref/pixel certificate.']
        if school=='nobyeon' and n in [15,16,17]:
            issues=['Manifest sharedSourceContext null; the [16~17] common text/scatter is wrongly swallowed by q15, only incidentally present in q16 crop, absent from q17 binding.']
            if n==15:
                before=choices[4];choices[4]=before.split('[16~17]')[0].strip();figures=figures[:1];hwp_figures=hwp_figures[:1]
                amendments=[{'field':'choices[4]','beforeSha256':digest(before),'after':choices[4],'basis':'Original printed q15 choice ends before [16~17]; completed visual source places new context in right column.'},{'field':'figureOwnership','before':'two figures owned by15','after':'income scatter belongs15; examination scatter belongs common16-17','basis':'Original printed heading and source figure record197/PDFxref26.'}]
            else:amendments=[{'field':'sharedSourceContext','before':None,'after':'NB-original-printed-16-17','basis':'Original page4 shared [16~17] heading and same20-point plot.'}]
        score={'parentScore':printed_score,'printedOccurrences':q['printedScoreOccurrences'],'parentCountedOnce':True,'originalPrintedScoreObserved':printed_score,'originalTotalCertification':False,'parts':None,'partsAllocationStatus':'not separately printed' if q['questionType']=='written' else 'single MC item'}
        if school=='gyeongilyeo' and n==20:score.update({'parts':[{'role':'(1)','score':4},{'role':'(2)','score':3}],'partsAllocationStatus':'printed4+3=parent7'})
        scaffold=None
        if school=='nobyeon' and n==22:scaffold={'namedBlanks':['가','나','다','라','마'],'additionalEmptyBlanks':['AH','p','q'],'omittedReasoningRequired':True,'parentScore':11,'perBlankScores':None,'ratioOrientation':'sinx=q/p, confirmed in original print and completed visual; do not reverse by textlayer fraction order','providedReasoningIsStudentQuestion':True,'originalAnswerNotIncluded':True}
        tables=[]
        if school=='gyeongilyeo' and n==3:tables=[{'headers':['각도','sin','cos','tan'],'rows':[[31,'.5150','.8572','.6009'],[32,'.5299','.8480','.6249'],[33,'.5446','.8387','.6494'],[34,'.5592','.8290','.6745'],[35,'.5736','.8192','.7002']]}]
        if school=='gyeongilyeo' and n==21:tables=[{'headers':['각도','tan'],'rows':[[32,'.60'],[34,'.65'],[36,'.70'],[38,'.75'],[40,'.80']],'approximationPolicy':'use supplied table values; source rounding instruction unspecified'}]
        if school=='nobyeon' and n==13:tables=[{'kind':'data-list','values':[6,10,11,7,'a',12,13,10]}]
        if school=='nobyeon' and n==20:tables=[{'headers':['학생','A','B','C','D','E'],'rows':[['맥박수(회)',84,'a',78,'b',81],['편차(회)',2,'c',-4,0,-1]]}]
        if school=='nobyeon' and n==21:tables=[{'headers':['학생','남학생','여학생'],'rows':[['학생수(명)',12,18],['평균(점)',65,65],['표준편차(점)','sqrt(10)',3]]}]
        figure_refs=[]
        if hwp_figures or figures:
            crop_refs=q['questionPageCrops'][:1] if school=='nobyeon' and n==15 else q['questionPageCrops']
            figure_refs=[{'role':'source-question-reference','crop':c,'quarantined':True,'finalTwinAssetAllowed':False,'rawOriginalScan':False} for c in crop_refs]
        if school=='nobyeon' and n in [16,17]:
            common_crop=m['questions'][14]['questionPageCrops'][1]
            figure_refs.append({'role':'shared-stem16-17','crop':common_crop,'quarantined':True,'finalTwinAssetAllowed':False,'rawOriginalScan':False,'owner':'NB-original-printed-16-17'})
        content={'questionNumber':n,'newSourceReferenceId':q['newSourceReferenceId'],'stem':stem,'choices':choices,'questionType':q['questionType'],'score':score,'sourceFigureReferences':figure_refs,'rawHwpStem':q['hwpScriptStem'],'rawHwpChoices':q['hwpScriptChoices'],'tables':tables,'providedScaffold':scaffold,'sharedSourceContext':shared if school=='nobyeon' and n in [16,17] else None,'originalAnswersOmitted':True,'originalSolutionsOmitted':True,'canonicalConversionCertified':False,'sourceAssetsQuarantined':True,'authoringRelease':False}
        content_digest=digest(content)
        # Whitelist is question-only reviewer input selection, not author/policy release.
        selected_for_question_only=school!='gyeongilyeo' and status!='hard-exclude-proposed'
        source_holds=['KI printed first semester conflicts with nominal second semester; school unbound'] if school=='gyeongilyeo' else []
        if issues:source_holds.extend(issues)
        if status=='hard-exclude-proposed':source_holds.append('Official2015 no_ratio_identities: core or full choices outside target scope; do not author a same-core twin.')
        grade={'grade':'중3','edition':'2015','appliedSourceEditionBasis':'2025middle3→2015;2022middle3 rollout2027. KI2025/grade observed but school/term conflict remains.','standardCodes':standards,'coreConceptProposal':core,'procedureProposal':procedure,'status':status,'gradeApproved':False,'hardExclusionGround':'Official2015 physical39/printed35: 삼각비 사이의 관계는 다루지 않는다.' if status=='hard-exclude-proposed' else None,'restrictions':['no arbitrary trig identities','angles0..90 for ratio values','no circle proportionality','no sine/cosine law,Heron,vector,addition formula','no overly complicated transformed geometry assessment'],'sevenStudentSurfaces':{
          'stem':{'sourceObserved':True,'risk':status},'choices':{'sourceObserved':len(choices)==5 if q['questionType']=='multiple-choice' else None,'risk':'inspect all five; arbitrary identity choices outside scope' if status=='hard-exclude-proposed' else 'source observed; final twin choices pending'},'figuresAndNotation':{'sourceObserved':True,'risk':facts,'tablesIncluded':bool(tables)},'answerFormat':{'sourceObserved':'MC5choices' if q['questionType']=='multiple-choice' else 'written requested full reasoning; parent score preserved','risk':'source answer not read/exported; future format must remain within grade'},'studentSolution':{'status':'not-exposed-not-reviewed','risk':'No original solution used. New author solution and independent grade review are required.'},'requiredProcedure':{'status':'proposal-only','risk':procedure},'prerequisites':{'status':'proposal-only','risk':'Use actual perpendicular heights,triangle congruence/similarity,Pythagorean and ratio definitions; never import prohibited higher methods.'}},'curriculumEvidenceBinding':bound(curriculum_path)}
        unit=units[unit_sections[unit_key]]
        if school=='gyeongilyeo' and n==17:unit=None
        printed_page=(1 if n<=7 else 2 if n<=13 else 3 if n<=18 else 4) if school=='gyeongilyeo' else ((1 if n<=7 else 2 if n<=14 else 3 if n<=19 else 4) if school=='gyeseong' else (2 if n<=5 else 3 if n<=11 else 4 if n<=17 else 5 if n<=21 else 6))
        original_joins=[]
        for alt in alternatives:
            an=alt['alternative']
            pn=({1:3,2:4,3:6,4:5}[printed_page] if school=='gyeseong' and an==1 else (printed_page-1 if school=='nobyeon' and an in [1,5,6] else printed_page))
            preview=next(x for x in alt['previewBindings'] if x['page']==pn)
            original_joins.append({'alternative':an,'originalPdfSha256':alt['source']['sha256'],'pdfPage':pn,'printedPage':printed_page,'preview':preview,'reviewerOnly':True,'handwrittenAnnotationsIgnored':True,'answerSheetPageUsed':False})
        report={'schemaVersion':1,'schoolKey':school,'questionNumber':n,'verifierId':VERIFIER,'method':'independent-source-component-comparison','status':'review-complete-with-individual-holds','newAuthorAnswersRead':False,'originalAnswerSheetViewedOnlyForClassification':school=='gyeseong','originalKeysUsed':False,'sourceIdentity':identity,'sourcePrintedQuestionPage':printed_page, 'bindings':{'manifest':bound(mp),'sourceInputs':selected['selected'],'originalPrintedComparisons':original_joins,'quarantinedQuestionCrops':q['questionPageCrops'],'sourceContentDigestFromParser':q['sourceContentDigest'],'reviewQuestionOnlyDigest':content_digest,'positionedCharactersDigest':digest(q['pdfReference']['positionedCharacters']),'rawHwpScriptsDigest':digest({'stem':q['hwpScriptStem'],'choices':q['hwpScriptChoices']}),'mathExpressionsDigest':digest(q['mathExpressions']),'figureRecordsDigest':digest(hwp_figures),'figureCorrespondenceDigest':digest(figures),'tableDigest':digest(tables),'scoreAndPartsDigest':digest(score),'reviewObservationDigest':digest(obs)},'componentComparison':{'actualViews':'all completed crop contact sheets and corresponding original printed question page(s)','hwpRecordAndMathAnchors':oldq['anchorChecks'],'allAnchorChecksPass':all(all(x['checks'].values()) for x in oldq['anchorChecks']),'sourceMathScriptsPreserved':True,'mathExpressionCount':len(q['mathExpressions']),'fiveChoicesOrWrittenObserved':True,'figureFactsObserved':facts,'hwpFigureRecords':hwp_figures,'pdfFigureCorrespondence':figures,'tables':tables,'providedScaffold':scaffold,'score':score,'canonicalIssues':issues,'newBoundaryAmendments':amendments,'unknownControlsCount':len(q['unmappedItems']),'countOrNoUnknownsIsApproval':False},'curriculumCoreMethodProposal':grade,'metadataProposal':{'unit':unit,'unitStatus':'historical UUID/section match proposal by observed core; not target permission','familyKey':None,'familyStatus':'held-no-semantic-live-family-assignment','liveBankSnapshotBinding':bound(bank_path),'liveBankSnapshotCapturedAt':bank['capturedAt'],'freshNow':False,'registryBinding':bound(registry_path),'sourceTopicLabel':q['topicLabelFromSource'],'sourceDifficultyLabel':q['difficultyLabelFromSource'],'difficultyStatus':'source preparation label not original printed difficulty or measured target equivalence; pending','score':printed_score},'questionOnlyWhitelist':{'selected':selected_for_question_only,'scope':'question-only source access for staged author planning; not author/policy release','blockers':source_holds,'rawOriginalsAllowed':False,'answerSheetAllowed':False,'sourceCropMayNeverBeFinalTwinFigure':True,'independentApproval':False},'gates':gates}
        if unit is None:report['metadataProposal']['unitStatus']='held-no-semantic-middle3-unit-match: assessed area-extension core has no trig; do not force closest 삼각비의 활용 label'
        write(ROOT/'items'/school/f'q{n:02d}.json',report)
        write(ROOT/'question-only-staged'/school/f'q{n:02d}.json',content)
        report['reportPath']=f'items/{school}/q{n:02d}.json';reviews.append(report)
        if selected_for_question_only:
            whitelist.append({'schoolKey':school,'questionNumber':n,'newSourceReferenceId':q['newSourceReferenceId'],'path':f'question-only-staged/{school}/q{n:02d}.json','sha256':sha((ROOT/f'question-only-staged/{school}/q{n:02d}.json').read_bytes()),'reviewQuestionOnlyDigest':content_digest,'score':printed_score,'scoreAndPartsDigest':digest(score),'sourceYear':2025,'sourcePrintedSemester':2,'figureRecordsDigest':digest(hwp_figures),'figureCorrespondenceDigest':digest(figures),'tableDigest':digest(tables),'sharedContextDigest':shared['contentDigest'] if school=='nobyeon' and n in [16,17] else None,'gradeStatus':status,'componentHolds':source_holds,'allowedForSourceOnlyPlanning':True,'authoringRelease':False,'directUseAllowed':False,'answer':None,'solution':None})
write(ROOT/'question-only-whitelist.json',{'schemaVersion':1,'scope':'KI22/KSE23/NB22 source-only selection; no original answer or solution fields copied','selectedQuestionCount':len(whitelist),'authoringReleasedCount':0,'selected':whitelist,'excluded': [{'schoolKey':r['schoolKey'],'questionNumber':r['questionNumber'],'reason':r['questionOnlyWhitelist']['blockers']} for r in reviews if not r['questionOnlyWhitelist']['selected']],'originalAnswerSheetFilesAllowed':0,'rightsApprovals':0,'gradeApprovals':0,'familyApprovals':0,'nativeApprovals':0})
write(ROOT/'shared-context-review.json',{'schemaVersion':1,'nobyeon16_17':shared,'codeChecks':{'pointCount':len(points),'uniquePointCount':len(set(points)),'allOnPrinted10PointGrid':all(x%10==y%10==0 and 0<=x<=100 and 0<=y<=100 for x,y in points),'fifthRankSum':ranked[4],'nextRankSum':ranked[5],'noTieAcrossFifthBoundary':ranked[4]>ranked[5],'answerOrAverageExported':False},'ownershipEvidence':'NB original printedpage4 [16~17]; HWPSection1 record197 BIN000D;completedPDFpage4 xref26; q15 only owns income scatter BIN000A/xref25.','originalKeyUsed':False})
write(ROOT/'review-index.json',{'schemaVersion':1,'verifierId':VERIFIER,'method':'independent-source-component-comparison','finalizedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':{'newParsedParents':67,'schools':{'KI':22,'KSE':23,'NB':22},'originalParentsVisuallyCompared':67,'formalSourceCertifiedParents':0,'identitySupportedPrintedParentsObserved':45,'newTwins':0,'questionOnlyPlanningWhitelist':len(whitelist),'hardExclusionProposals':[{'schoolKey':r['schoolKey'],'questionNumber':r['questionNumber']} for r in reviews if r['curriculumCoreMethodProposal']['status']=='hard-exclude-proposed'],'independentMathGradeApprovals':0,'rightsApprovals':0,'familyApprovals':0,'nativeApprovals':0,'fullApprovals':0},'manifestBindings':manifest_bindings,'runtimeProbe':bound(ROOT/'runtime-probe-resume-20261012.json'),'rawAuditBinding':bound(ROOT/'custody-record-audit.json'),'rawPreviewBindings':bound(ROOT/'preview-bindings.json'),'currentOriginalAvailability':[{'path':x['path'],'existsAtFinalization':pathlib.Path(x['path']).exists(),'priorBoundReadSucceeded':x['matchesManifest']} for s in audit['schools'] for x in s['inputs']],'capacityHistory':{'selectedModelCapacityInterruptions':'reported by user during this task; exact provider payload not accessible, no model replacement or duplicate writer','currentExecution':'commands/writes/readback successful; work resumed','sourceMountAvailabilityHold':'N: unavailable at finalization; prior actual byte/record audit and all captured views retained'},'gates':gates,'itemReports':[{'schoolKey':r['schoolKey'],'questionNumber':r['questionNumber'],'path':r['reportPath'],'sha256':sha((ROOT/r['reportPath']).read_bytes()),'status':r['curriculumCoreMethodProposal']['status']} for r in reviews]})
write(ROOT/'classification-evidence.json',{'schemaVersion':1,'projectTypeSafeSkill':bound(WORKTREE/'.agents/skills/typesafe-ai/SKILL.md'),'liveDocsReadOn':'2026-10-12','liveDocs':['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/confidence','https://docs.typesafe.ai/cookbooks/citation_check'],'markdownPathsFailedNormalPagesSucceeded':True,'inferenceApiCalls':0,'design':'Independent dimensions for printed identity, component transcription, curriculum core/procedure, family, difficulty, rights, native; unknown and exclusion are separate. Counts/hashes are deterministic code, not semantic approval. No API integration changed.','officialCurriculumEvidence':bound(curriculum_path),'restrictions':curriculum['official_middle_restrictions'],'solverRules':bound(WORKTREE/'scripts/import/exam-paper/solver_rules.json'),'rulesCaveat':'Keyword/shape detection is bounded. Official no_ratio_identities and whole-choice surface restrictions override legacy regex omissions.','bankSnapshot':bound(bank_path),'bankSnapshotScope':'historical2026-10-08T13:00:16.891043Z,22Units/302families; no freshDBread, no semantic family approval, protected82 unchanged','registry':bound(registry_path),'gates':gates})
print(json.dumps({'reports':len(reviews),'questionOnlyPlanningWhitelist':len(whitelist),'hardExclusionProposals':4,'sourceOrGradeApprovals':0,'originalMountAvailableNow':all(pathlib.Path(x['path']).exists() for s in audit['schools'] for x in s['inputs'])},ensure_ascii=False))
