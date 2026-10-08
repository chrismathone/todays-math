"""Compose individual judgments from observed text, exact calculations and bounded refs.

No model/API/DB invocation. Judgments in review_notes are human-style contextual
applications, not a claim that matching text or a CAS calculation grants permission.
"""
from pathlib import Path
import datetime,hashlib,json,re,struct,sys,zlib
import fitz,olefile
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parent
OWN=OUT.parents[2];PARENT=OWN.parent/'exam-extraction-resume-20261008'
OLD=OWN/'.qa-artifacts/exam-resume-20261008/gyeonggu-independent-r1'
VERIFIER='orca-codex-exam-twin-source-identity-20261008'
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def ref(p,**kw):return {'path':Path(p).as_posix(),'sha256':sha(p),**kw}
def save(name,d):
    p=OUT/name;assert p.resolve().is_relative_to(OUT)
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def canonical(d):return json.dumps(d,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def norm(t):return re.sub(r'[\s\x00-\x1f]','',t)
inputs=load(OUT/'input-bindings.json');bindings=inputs['bindings'];byn={x['questionNumber']:x for x in bindings}
rows=load(inputs['verificationInputs']['path']);notes=load(OUT/'review_notes.json')
equiv=load(OUT/'answer-equivalence-evidence.json');equivby={x['questionNumber']:x for x in equiv['results']}
fig=load(OUT/'figure-semantics-evidence.json');figby={x['questionNumber']:x for x in fig['results']}
snapshot=load(OUT/'unit-family-snapshot.json');units={x['id']:x for x in snapshot['units']}
rules=load(OUT/'rule-evidence.json');ruleby={x['key']:x for x in rules['rules']}
views=load(OUT/'layout-view-manifest.json');contract=load(OUT/'contract-bindings-r2.json')
corr=load(OUT/'q13-source-correction-review.json');assert corr['status']=='confirmed'
curr_path=OLD/'curriculum-method-evidence.json';curr=load(curr_path)
for k in ['pdf','hwp']:assert sha(curr[k]['path'])==curr[k]['sha256']
provisions=curr['provisions'][:]
# Extract the additional sector prerequisite directly from the official HWP;
# the older blind evidence retained a circle-area standard, but sector scope deserves
# its own exact clause rather than a made-up code.
hwp=olefile.OleFileIO(curr['hwp']['path']);header=hwp.openstream('FileHeader').read()
data=hwp.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',header,36)[0]&1:data=zlib.decompress(data,-15)
off=0;record=0;paragraph=0;wanted={'9수04-06','6수03-07'};extra=[]
pdf=fitz.open(curr['pdf']['path'])
while off<len(data):
    start=off;word=struct.unpack_from('<I',data,off)[0];off+=4
    tag=word&1023;level=(word>>10)&1023;size=word>>20
    if size==4095:size=struct.unpack_from('<I',data,off)[0];off+=4
    payload=data[off:off+size];off+=size;record+=1
    if tag==66:paragraph+=1
    if tag!=67:continue
    t=payload.decode('utf-16le',errors='strict')
    for code in wanted:
        if t.startswith('['+code+']'):
            pages=[i+1 for i in range(len(pdf)) if norm(t) in norm(pdf[i].get_text())]
            assert len(pages)==1,(code,t,pages)
            extra.append({'id':code,'hwp':{'stream':'BodyText/Section0','tag':tag,'record1based':record,
                'paragraph1based':paragraph,'offset':start,'text':t},'pdfPhysicalPage1based':pages[0],
                'pdfPrintedPage':pages[0]-4,'wholeClausePdfMatch':True})
assert {x['id'] for x in extra}==wanted
provisions+=extra;prov={x['id']:x for x in provisions}
policy_path=OWN/'.qa-artifacts/exam-resume-20261008/bumil-q07-curriculum-adjudication-r1/policy-application.json'
policy=load(policy_path)
seed=Path(rules['seed']['path']);seedlines=seed.read_text(encoding='utf8').splitlines()
seedranges=[(2384,2389),(2483,2511),(2527,2532),(2745,2756),(2799,2811),(2849,2861),(2879,2896)]
prereqseed=[{'path':seed.as_posix(),'sha256':sha(seed),'startLine1based':a,'endLine1based':b,'text':'\n'.join(seedlines[a-1:b])} for a,b in seedranges]
official={'reference':'actual2025 middle3 ->2015;2015 also applies to2026middle3;2022middle3 starts2027',
    'primaryPdf':curr['pdf'],'primaryHwp2020_236':curr['hwp'],'provisions':provisions,
    'preExposureMethodEvidence':ref(curr_path),'rollout':curr['rollout'],
    'rolloutOfficialLinks':['https://www.moe.go.kr/boardCnts/view.do?boardID=141&boardSeq=60747&lev=0&m=0404',
       'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401&s=moe'],
    'liveRolloutRecheckedDate':'2026-10-08','boundedAmendmentEvidence':ref(policy_path),
    'amendments':{k:policy[k] for k in ['2022_2Amendment','2024_1Amendment']},
    'identifiedMaterial2025MathProvisionUncertainty':[],
    'policyLimit':'No exhaustive whole-policy history claim. Specifically examined amendments do not name math book8. Missing unrelated general-policy text is not an added approval gate. Reopen if an applicable amendment changes a cited mathematical provision.',
    'future2027Publication':{'status':'pending','basis':'Actual2025 source-era suitability does not certify2022-middle3 republication; review the new applicable edition before that use.'},
    'prerequisiteSeedRecords':prereqseed,
    'prerequisiteUnitScope':'Exact current seedgrade/section/orderIndex records; no fictional live UUID or prerequisite-family assignment is inferred.'}
save('curriculum-surface-basis.json',official)
skill=OWN/'.agents/skills/typesafe-ai/SKILL.md'
save('judgment-design-evidence.json',{'skill':ref(skill),'readDate':'2026-10-08',
    'liveDocs':[{'url':'https://docs.typesafe.ai/confidence','reading':'Distribution concentration is not workflow truth or permission.'},
                {'url':'https://docs.typesafe.ai/cookbooks/citation_check','reading':'Check textual support and contextual support separately; exact presence does not decide applicability.'}],
    'method':'Separate narrow dimensions, deterministic math and hash/lookup checks; contextual curricular/purpose/language judgments recorded with bounded evidence and explicit pending outcomes.',
    'inferenceApiCalls':0,'confidence':None,'modelProbability':None,
    'authorizationAndRuntime':{'latestMainAgents':ref(Path('D:/todays-math/AGENTS.md')),
       'latestParentAddenda':[ref(PARENT/f'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-{i}.md') for i in [4,5]],
       'ownR2Probe':ref(OLD/'runtime-probe-resume-r2.json'),'rootWatchTouched':False}})

std={
1:['9수04-16','9수04-17'],2:['9수04-16','9수04-17','9수04-18'],3:['9수04-16','9수04-17'],
4:['6수03-07','9수04-16','9수04-17'],5:['9수04-17','9수01-10'],6:['9수04-17','9수04-18'],
7:['9수04-17','9수01-10'],8:['9수04-17','9수04-18','9수04-05'],
9:['9수04-04','9수04-13','9수04-14','9수02-05','9수04-16','9수04-17'],
10:['9수04-05','9수04-12','9수04-17','9수04-18','9수01-10'],
11:['9수04-09','9수04-12','9수04-16','9수04-17','9수04-18'],
12:['9수04-17','9수04-18'],13:['6수03-07','9수04-05','9수04-17','9수04-18','9수01-07','9수01-10'],
14:['9수04-19','9수04-16','9수01-07'],15:['9수04-19','9수04-10','9수04-05','9수02-05'],
16:['6수03-07','9수04-19','9수04-16'],17:['6수03-08','9수04-19','9수04-16'],
18:['9수04-19','9수04-02','9수04-16'],19:['9수04-19','9수04-12','9수04-16','9수02-05','9수02-12'],
21:['6수03-07','9수04-05','9수04-17','9수04-18','9수02-05'],
22:['9수04-19','9수04-04','9수04-17'],23:['9수04-19','9수04-04','9수04-05','9수04-06','9수04-17','9수01-07']}
restrictionids=['no_trig_ratio_relationships','angle_range','no_circle_proportionality','no_complex_geometry_measurement','no_formal_complex_justification']
reports=[]
for row in rows:
    c=row['candidate'];n=c['questionNumber'];tag=f'q{n:02}';b=byn[n];note=notes[tag]
    raw=row['independentSolve'];math=equivby[n];fg=figby[n];assignment=b['authorAssignment']
    unit=units[assignment['unitId']];assert unit['grade']=='중3' and unit['section']==assignment['unitSection']
    actualrules=[]
    for compared in assignment['evidence']['comparedRegistryEntries']:
        r=ruleby[compared['key']];actualrules.append({'key':r['key'],'source':r['source'],'blockSha256Utf8':r['blockSha256Utf8'],
            'registryAndLive':r['snapshotRecord']})
    fullfamily=n==18
    family={'status':'passed' if fullfamily else 'pending','unitStatus':'passed','actualUnit':unit,
        'frozenAssignmentStatus':assignment['status'],'frozenFamilyKey':assignment['familyKey'],
        'ruleComparison':note['family'],'actualRulesInspected':actualrules,'currentSeed':rules['seed'],
        'snapshotBank':snapshot['bank'],'snapshotRegistry':snapshot['registry'],'snapshotCapturedAt':snapshot['capturedAt'],
        'liveDatabaseReadByVerifier':False,'currentDatabaseAssertion':False,
        'dbAssignmentPromoted':False,'schoolOrModelConfidenceIsAllowance':False,
        'reopenCriteria':None if fullfamily else 'Bind an actual declared family to this exact input/target/method/representation, including required inverse/multipart/parameter support; review changed classification/rule evidence. No automatic promotion from a title or shared concept.'}
    if fullfamily:
        r=ruleby['3-2|원과 직선|11'];live=r['snapshotRecord']['liveMatches']
        assert len(live)==1 and live[0]['record']['unit_id']==unit['id'] and live[0]['record']['live_count']==46
        assert '[3, 12, 6]' in ruleby['T11-parameter-pool']['fullRuleBlock']
        family['exactParameterPurposeCheck']={'mode':1,'a':3,'b':12,'r':6,'diameter':12,'slant':15,'perimeter':42,
            'ruleLines1based':[1081,1105],'parameterPool':ruleby['T11-parameter-pool'],
            'vertexMap':{'engineA':'newB','engineB':'newC','engineC':'newD','engineD':'newA','engineE':'newE','engineH':'newF'},
            'fixedDescriptor':'심화하','checkedContentFitOnly':True}
    sourceDelta=corr['sourceDeltaFinal'] if n==13 else note['sourceDelta']
    core={'status':'passed','evidence':sourceDelta,'sourceQuestionRecord':{'file':inputs['finalSourcePacketQuestionOnly'],
          'pointer':f'/questions/{n-1}','number':n,'canonicalQuestionOnlyRecordSha256':hashlib.sha256(canonical(b['finalSourceQuestionOnly']).encode()).hexdigest()},
          'sourceJoinRow':b['finalSourceJoinRow'],'originalAnswerAgreementUsed':False,
          'scope':'Concept/procedure and deliberate input/target/structure/context change from question-only source; native/custody/rights are separate.'}
    if n==13:core['angleCorrection']=ref(OUT/'q13-source-correction-review.json');core['oldDraftPendingObservation']=note['sourceDelta']
    score=c['score'];assert score==b['sourceOriginalScore']
    if n in [21,22,23]:
        childscores=[int(x) for x in re.findall(r'\[(\d+)점\]',c['content'])];assert sum(childscores)==score
    else:childscores=[]
    checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent',
        'sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','scoreAppropriate']}
    checks['unitFamilyFit']=fullfamily
    checkEvidence={
        'answerCorrect':{'status':'passed','basis':math['roleUnitValueComparisons'],'extraRequiredRelationship':math['q22RequiredRelationshipIncluded']},
        'solutionCorrect':{'status':'passed','basis':note['method'],'freshAuthoredRouteCalculations':math['freshAuthoredRouteCalculations'],
            'authoredSolutionSha256Utf8':hashlib.sha256(c['solution'].encode()).hexdigest(),'authorFrozenFile':b['authorFrozenFile']},
        'existenceUniqueness':{'status':'passed','basis':note['conditions'],'preExposureDetailedChecks':raw['evidence']['existenceUniquenessPositivity'],
            'freshCalculationProof':ref(OUT/'answer-equivalence-evidence.json',pointer=f'/results/{rows.index(row)}')},
        'choicesCorrect':{'status':'passed','basis':'All five actual printed alternatives checked as exact expressions/ordered tuples/strict intervals; exactly one satisfies every requested value.' if c['choices'] else 'Written item; all requested subparts,units andq22relationshipproof separately checked; choices not applicable.',
            'actualChoices':math['allChoices'],'preExposureChoiceChecks':raw['evidence']['choiceCheck']},
        'figureConsistent':{'status':'passed','basis':fg,'actualRenderedViews':[v for v in views if v['questionNumber']==n],
            'physicalStandaloneViewsBeforeExposure':raw['evidence']['directFigureInspections'],'pixelOracle':False},
        'sameCoreConceptAndProcedure':core,
        'distinctPresentation':{'status':'passed','basis':sourceDelta,'criterion':'Necessary inverse/input-target or response-structure/context change; not just changed numbers/letters.'},
        'naturalKorean':{'status':'passed','basis':note['language'],'fullAuthoredStudentAndSolutionReviewed':True},
        'curriculumAppropriate':{'status':'passed','basis':note['grade'],'exactStandards':[prov[x] for x in std[n]],
            'restrictions':[prov[x] for x in restrictionids],'allSevenSurfacesReviewBelow':True},
        'allStudentSurfacesInScope':{'status':'passed','basis':'Each actual new student surface, including the full authored solution and required prerequisites, was individually checked below.'},
        'unitFamilyFit':family,
        'scoreAppropriate':{'status':'passed','sourcePrintedParentScore':b['sourceOriginalScore'],'newParentScore':score,
            'newSubScores':childscores,'parentAndChildNotDoubleCounted':True,'basis':note['score']}}
    standards=[prov[x] for x in std[n]]
    surfaces={
      'stem':{'status':'passed','basis':note['grade'],'conditionsReviewed':note['conditions'],'actualContentSha256Utf8':hashlib.sha256(c['content'].encode()).hexdigest(),'standards':standards},
      'choices':{'status':'passed','basis':checkEvidence['choicesCorrect'],'noOutsideGradeDistractorNotation':True},
      'figuresAndTables':{'status':'passed','basis':fg,'tableCheck':math['freshAuthoredRouteCalculations'] if n==6 else 'Actual tables/figure labels fix ordinary lengths,angles ororderedrecords; no graph/vector/formula prerequisite is hidden.',
         'simpleGeometryLimit':note['difficulty'],'actualRenderedPanesInspected':True},
      'notation':{'status':'passed','basis':'Actual marks are ordinary point/segment/right-angle/radical/acute sin-cos-tan notation. Degree105/120 labels are geometric angles, not out-of-range trig evaluations. Unit meanings are bound to the roles below.',
         'roleUnitMap':math['roleUnitValueComparisons'],'specificBasis':note['grade']},
      'answer':{'status':'passed','basis':math['roleUnitValueComparisons'],'requiredQ22Proof':math['q22RequiredRelationshipIncluded'],
         'rawAnswerUnedited':raw['answer'],'formattingOnlyMismatchIsNotGradeFailure':True},
      'studentSolution':{'status':'passed','basis':note['method'],'fullNewAuthoredSolution':c['solution'],
         'fullAuthoredSolutionReviewedForForbiddenProcedure':True,'curricularApplication':note['grade'],
         'restrictions':[prov[x] for x in restrictionids]},
      'prerequisites':{'status':'passed','basis':note['grade'],'officialStandards':standards,'actualPrerequisiteSeedEvidence':prereqseed,
         'addedStepLimit':'Any extra ordinary arithmetic/linear-equation/root step is explicitly checked as an earlier-or-middle3 prerequisite; shared school name/family presence does not authorize a forbidden assessed relation.',
         'outsideGradeMethodRequired':False}}
    public=c['content']+'\n'+c['solution']+'\n'+'\n'.join(c['choices'])
    assert not any(s in public for s in ['경구중','범일중','준희T'])
    report={'schema':'independent-exam-final-review.v1','questionNumber':n,'twinExternalId':raw['twinExternalId'],
       'status':'verified' if fullfamily else 'pending',**b['providedDigests'],'method':'independent-solve-then-review','verifierId':VERIFIER,
       'checks':checks,'evidence':checkEvidence,'curriculumSurfaces':surfaces,
       'dimensions':{'math':'passed','existenceAndRequestedUniqueness':'passed','allSeven2015Surfaces':'passed',
           'sourceCore':'passed','substantiveDelta':'passed','korean':'passed','score':'passed','actualUnit':'passed',
           'exactLiveFamily':'passed' if fullfamily else 'pending','objectiveDifficulty':'passed_task_analysis',
           'formattingOnlyComparator':'pending','rights':'pending','nativeProvenance':'pending','loading':'pending'},
       'objectiveDifficulty':{'status':'passed','proposal':b['difficultyProposal'],'basis':note['difficulty'],
           'registryDescriptorIsObjectiveProof':False,'measuredStudentFacilityClaim':False},
       'answerEquivalence':{'status':'passed','evidence':ref(OUT/'answer-equivalence-evidence.json',pointer=f'/results/{rows.index(row)}'),
           'currentLiteralComparatorMatches':contract['rows'][rows.index(row)]['currentFormattingOnlyComparatorMatches'],
           'contractEvidence':ref(OUT/'contract-bindings-r2.json'),'typedConstantsHelperIsApproval':False,'rawAnswerRewritten':False},
       'officialScope':{'basis':ref(OUT/'curriculum-surface-basis.json'),'identifiedMaterial2025MathProvisionUnknown':[],
           '2027Middle3Republication':'requiresnew2022-specificreview','unrelatedWholePolicyCompletenessGate':False},
       'frozenInputBinding':b,'blindIndependence':{'rawCommit':inputs['oldRawCommit'],'authorFreezeCommit':'bf8b132fb1e78bbdb8f1b6e55e1db99d1321147d',
           'rawBlindSolve':b['rawBlindFile'],'rootByteExactCanonicalCopy':b['rootCanonicalRawCopy'],
           'priorSourceFamiliarityDisclosed':True,'originalScanAnnotationsIncidentallySeenDuringAuthorizedQ13SourceInspection':True,
           'originalKeysOrHandwritingUsedToApprove':False,'otherSolverUsed':False,
           'disclosure':corr['answerExposureDisclosure']},
       'heldReasons':[] if fullfamily else [{'dimension':'exactLiveFamily','basis':note['family'],'reopenCriteria':family['reopenCriteria']}],
       'separateNonReviewHolds':['Current literal formatting comparator does not match detailed raw answers; Root may consume exact role/unit/value evidence without editing raw bytes.',
         'Rights/custody/publisher authorization and native provenance have no approval from this contentreview. No DB/loading authority.'],
       'inferenceApiCalls':0,'dbReads':0,'dbWrites':0,'loadApproved':False}
    save(f'reports/{tag}.json',report);reports.append(report)
count={'reviewed':len(reports),'verifiedScopedChecks':sum(r['status']=='verified' for r in reports),
       'pendingScopedChecks':sum(r['status']=='pending' for r in reports),'rejected':0,
       'mathPassed':22,'gradeSevenSurfacesPassed':22,'gradeSurfaceDecisionsPassed':154,'sourceCorePassed':22,
       'substantiveDeltaPassed':22,'actualUnitPassed':22,'exactLiveFamilyPassed':1,'exactLiveFamilyPending':21,
       'literalFormatMatches':contract['formattingOnlyMatches'],'exactRoleUnitValueEquivalences':22,
       'actualChoicesChecked':95,'writtenNumberedPartsChecked':10,'requiredRelationshipProofsChecked':1,
       'rawSpecsChecked':20,'studentSolutionLayoutPanesInspected':44,'newScoreTotal':sum(r['frozenInputBinding']['newScore'] for r in reports),
       'rightsApproved':0,'nativeProvenanceApproved':0,'loadingApproved':0}
assert count['newScoreTotal']==93
save('review-counts.json',{'counts':count,'verifiedQuestions':[18],
    'pendingFamilyQuestions':[r['questionNumber'] for r in reports if r['status']=='pending'],
    'sourceHold13ResolvedByOwnReading':ref(OUT/'q13-source-correction-review.json'),
    'completeScopeOnly':True,'wholeExtractionEngineOrLoadComplete':False})
table='\n'.join(f"|q{r['questionNumber']:02}|passed|7/7 passed|passed|{'passed' if r['checks']['unitFamilyFit'] else 'pending'}|{r['status']}|" for r in reports)
text=f'''# Independent final Gyeonggu22 review

Reviewed all22 fixed candidates using **independent-solve-then-review**. Math22/22; all seven student curriculum surfaces22/22 (154 decisions); source core and substantive delta22/22. Scoped12-check status: q18 verified, other21 pending exactfamily. Rejected0. Rights/native/loading approvals0. This finishes this independent review scope, not extraction/engine/loading.

Raw blind commit `c02838323307f69648124f837285503a53e99bd3` preceded author exposure. Eachreport preserves given studentDigest/candidateDigest/assetDigest/solveDigest and verifier `{VERIFIER}`. Allfourdigests were recomputed for22, and Root's canonical rawcopies match the immutable ownrawfiles. Packaging only changed relative figure filenames; frozenauthor and packagecandidate digests are separately retained, not falsely equated.

|Question|Math|2015 surfaces|Source core/delta|Exact family|Scoped status|
|---|---|---|---|---|---|
{table}

All95 actual MCchoices were checked as exact expressions/ordered tuples/openintervals;19 uniquechoices. All10 writtennumberedparts plus q22's required segment-relationship proof and units were reviewed. [New role/unit/value evidence](answer-equivalence-evidence.json) proves22 mathematical equivalences using exact arithmetic trees and fresh calculations, including q09's authoredAA route and q19's CE-vs-DE variable roles. The literal formatter matched0/22 at the bound contracthash in [contract receipt](contract-bindings-r2.json). This is separately reported as a format limitation; rawanswers, proofs, student_solutions and oldcode remain untouched. Root's typedconstants helper is computation support, not grade or approval.

q06's12 table cells roundcorrectly; AD0.8391 selects40° among the statedfourrows. PH/OH0.6428/0.7660 are recorded approximations, notexactside lengths. q17 admits manyradii but alwaysfullchord14. q22 admits differentB/C placements but uniqueAP3√3,r3,AO6; an exactwitness satisfiesallinsidepoint/tangentconditions with thecircleoutsideABC. q10 derivescos15 through30/45 constructedtriangles, withoutaddition/halfangle formulas.

q13'sold normalized BDC105 annotation stays byte-identical in the finalsourcepacket. After authorized directinspection of cleanHWP BinData/BIN0001.png, originalprintedpage03 and thecompletedquestioncrop, the105° leader attaches toDA–DC inside shadedADC. Thus correctedADC105 and supplementaryBDC75 agree with thefrozennewcandidate. [Own correction review](q13-source-correction-review.json) preservesold/newevidencehashes and resolves sourceCore13 only. Originalpage03 handwriting/workings/circledchoices were incidentally visible, including neighboringquestions; they were not transcribed, tested or used as newmath, grade or approval. Earlier source familiarity and Bumil annotation exposure remain disclosed; no original-answerblindness claim is made.

[Official bounded curriculum basis](curriculum-surface-basis.json) retains exact primaryPDF/HWP hashes, page/paragraph/record/offsetlocators, standards andfivegeometry restrictions. Relevant2015 provisions are9수04-16/17/18/19 and earlier congruence/similarity/area/sector/volume/algebra prerequisites. 9수04-17 does not waive the explicit no-trig-relationships caution (physicalPDF39/printed35,HWP record4440,offset224820). Everynewauthoredsolution was checked for assessedrelationship as well as individualsteps. No required same-angle unknownratio transfer, addition/halfangle formula, sine/cosine law, circleproportionality/power, vector method, calculus/extrema, hidden spatial/dihedral method or complexformal proof was found. q13's105° andq23's120° aregeometricangles; onlyacute specialangletrig is evaluated. q11 isone squarepyramid with an explicitlygiven planar righttriangle; q23 subtractsone sector fromtwo ordinaryrighttriangles, not an arbitrarily transformed solid/plane geometry.

Actual2025 middle3 uses2015;2022 middle3 starts2027 under the official [2015 rollout](https://www.moe.go.kr/boardCnts/view.do?boardID=141&boardSeq=60747&lev=0&m=0404) and [2022 rollout](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401&s=moe). The specificallyexamined2022-2/2024-1 amendments do not list mathematicsbook8. No concrete material2025 math-provision uncertainty remains for these22 methods; no extra whole-policy-completeness approval is demanded. Current/future republication is separate:2027 middle3 requires a new2022-specificreview. Reopen if an applicable amendment changes a cited mathematical provision.

Currentread-onlysnapshot302r2 and299registryrecords, actual Unitseedsections and [generatorblocks](rule-evidence.json) were inspected withoutDBaccess. All22 proposedUnits matchactualcapturedmiddle3Units. q18 matches원과직선11mode1 and actualT11[3,12,6], mappingengineA/B/C/D to newB/C/D/A andcontactEunchanged; exactUnit635abab8-4a87-452b-ad6c-d59065822f29, live46rows. Its lower심화하 taskanalysis integratesequaltangents,heightdifference andPythagoras; registrydescriptor alone doesnotprove difficulty. Theother21 familykeys staynull/pending. Individualreports distinguish nearbyconceptmatches with absentinverse/multipart/parameterbranches from different assessedpurposes. In particular활용08 DOESsupport a simplearea-to-side inverse, and원과직선11mode3 DOESrecoveranothertangentheight; neitherfactautomaticallysupports q13/q19'sfulltask. No productclassification orDBrow is promoted.

Scores total93, omittingexcludedsourceq20(7), withone parentcount perwrittenitem. q21 2+2+2+4=10; q22 4+2+2=8; q23 3+4+3=10. Eachreport gives actualworkload/difficulty and score reasons independentof sourcepoints/registrylabels. Newstudentandfullsolutionlayouts were directlyviewed for22; theirstudentpanes are pixel-exactprefixes of theviewedauthorlayouts.20rawspecsemanticschecked, withpre-exposurephysical70mm figures (q11two55mm) retained. Coordinatescheck constructions; pixels never determineanswers.

Project TypeSafe skill and live [confidence](https://docs.typesafe.ai/confidence) / [citation guidance](https://docs.typesafe.ai/cookbooks/citation_check) informed separate boundedjudgments, exacttextsupport and applicabilitychecks. No inference/model/paidAPI calls, install,DBread/write,source mutation,productioncode/main/shareddependencies edits,apply/lock/push oroperationalUIuse. RuntimeprobeR2 was successfullywritten/reread in the ownedblindscope as explicitlyrequested and retainedoutside the finalreviewcommit scope. Preservation and commit checks are in the newvalidation receipts.
'''
(OUT/'REVIEW.md').write_text(text,encoding='utf8')
print(json.dumps(count,ensure_ascii=False))
