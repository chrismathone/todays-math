"""Record independent bounded decisions after the raw solve was sealed."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text('utf8'))
def ref(p):return {'path':Path(p).relative_to(OUT).as_posix(),'sha256':sha(p)}
def save(name,data):
 p=OUT/name;assert p.resolve().is_relative_to(OUT) and not p.exists()
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
b=load(OUT/'binding-validation.json');candidate=load(OUT/'inputs/package/private/q22/candidate.json');source=load(OUT/'inputs/source-question-only.json')
math=load(OUT/'answer-equivalence-and-math.json');curr=load(OUT/'curriculum-evidence.json');provs={p['id']:p for p in curr['provisions']};tax=load(OUT/'taxonomy-evidence.json')
engine=load(OUT/'strict-engine-check.json');preview=load(OUT/'render-preview-check.json')
assert engine['strict'] and engine['typeset'] and engine['rerenderByteIdentical'] and not engine['droppedDimensions']
assert not preview['overflow'] and not preview['networkRequests']
save('visual-review.json',{'method':'view_image at original resolution of source question-only crop, current expanded student+solution PNG, student-only PNG and strict rerendered figure',
 'sourceCrop':ref(OUT/'inputs/source-images/q22-part1.png'),
 'expandedStudentSolution':ref(OUT/'qa/q22-expanded.png'),'studentOnly':ref(OUT/'qa/q22-student.png'),'strictRerenderView':ref(OUT/'qa/q22-rerendered-figure.png'),
 'actualColumnWidthMm':preview['actualColumnWidthMm'],'actualSvgWidthsMm':preview['actualSvgWidthsMm'],
 'newLayoutObservation':'O,Q,S,T,U, alpha and beta all legible; beta arc is inside TU/TQ. Both right-angle marks are clear. Fractions in all five options and full new two-paragraph solution have no clipping or overflow.',
 'sourceLayoutObservation':'Clean question22 crop: radius1, four-point baseline/projection/tangent configuration, A-C-E ray, x atA,y atC,z atE and mixed ratio statements. Printed4-point score observed. No circled key/answer/solution annotation seen in supplied crop.',
 'sourcePointCorrespondence':{'A':'O','B':'S','C':'Q','D':'U','E':'T','F':'unlabeled upper quadrant endpoint V'},
 'figureGivenRelationsCompared':'Source C is arc point, B projection foot, D quadrant endpoint and DE vertical; new Q/S/U/T reproduces that topology with text-explicit ray order and two perpendiculars.',
 'standaloneRerenderPngNote':'PNG includes a wider white viewport; its actual embedded SVG is70mm as separately measured, not stretched.',
 'pixelsUsedToInferMathematicalValues':False,'originalAnswerExposureInThisSourceCrop':False,'oldAnswerAgreementAsApproval':False,
 'nativeOrPhysicalPrinterParityApproved':False})
bases={
 'stem':('passed','9수04-01/02/17/18; radius2, arcQ, O-Q-T order, perpendicularS/UT and open0..45 bound specify an elementary same-angle length-ratio task. beta stays45..90. The intended assessment is one cosine definition after geometric angle correspondence; no ratio relationship is demanded.'),
 'choices':('passed','All five are ratios of actual positive lengths or the common radius2. Exact physical-length differences are positive for options1/2/3/5 throughout0<k<1,ell>1. The optional45-degree right-isosceles comparison uses9수04-10; no general trig identity/addition formula or advanced inequality is required from students.'),
 'figuresAndTables':('passed','One quadrant, projection and perpendicular at its endpoint. Two right triangles/parallel lines are9수04-01/02 prerequisites. Actual strict v2 geometry satisfies the given order and angles; illustrative alpha40 is not an added student datum. No table, proportional-circle theorem, complex measurement or external bitmap is needed.'),
 'notation':('passed','O,Q,S,T,U line labels, alpha/beta angle names, degree open interval, cos and simple length fractions. No coordinate/vector/radical notation in actual student stem/options/answer/new solution. All denominators are positive; beta is within the official0..90 range.'),
 'answer':('passed','One MC mark④. Its selected value SQ/2 is a dimensionless adjacent-leg/hypotenuse ratio at beta in triangleOQS under9수04-17. Raw answer also states that value and is unchanged. No numeric angle is invented.'),
 'studentSolution':('passed','Actual authored solution states QS andUT both perpendicular toOU, hence parallel; O-Q-T then makes angleOQS=angleUTQ=beta. It identifies adjacentSQ,hypotenuseOQ2 and applies one cosine definition. Equal-angle transfer under9수04-02 avoids a complementary/inter-ratio trig identity; two short reasoning paragraphs do not require complex formal deduction.'),
 'prerequisites':('passed','Current seed records include middle1 평행선 and 삼각형의 내각과 외각, middle2 이등변삼각형의 성질 and middle3 삼각비의 뜻/값. Official9수04-01/02/05/10/17/18 supply line relation, angle correspondence, triangle angle/45 comparison and cosine definition. Developer SymPy/Pythagorean parameterization/coordinate witness is supplemental proof, not required student procedure; no upper-grade prerequisite introduced.')}
surfaces={}
codes_by_surface={'stem':['9수04-01','9수04-02','9수04-17','9수04-18'],'choices':['9수04-10','9수04-17'],'figuresAndTables':['9수04-01','9수04-02','9수04-17'],
 'notation':['9수04-01','9수04-17'],'answer':['9수04-17'],'studentSolution':['9수04-02','9수04-17'],'prerequisites':['9수04-01','9수04-02','9수04-05','9수04-10','9수04-17','9수04-18']}
for key,(status,basis) in bases.items():
 surfaces[key]={'status':status,'basis':basis,'officialProvisions':[provs[k] for k in codes_by_surface[key]],
  'restrictionsReviewed':[provs[k] for k in ['no_trig_ratio_relationships','angle_range','no_circle_proportionality','no_complex_geometry_measurement','no_formal_complex_justification']],
  'gradeSource':'actual2025 middle3 ->2015','permissionFromSchoolRegistryOrProbability':False}
surfaces['prerequisites']['actualSeedRecords']=curr['actualPrerequisiteSeedRecords']
check_evidence={
 'answerCorrect':'Sealed independent answer chooses④ and exact SQ/2; authored answer④ selects actual option4 SQ/2. Same role/unit/exact numerator and denominator verified in new code, no string-as-algebra shortcut.',
 'solutionCorrect':'Authored two paragraphs checked step-by-step: perpendiculars -> parallel; directed ray order -> same beta; adjacentSQ/hypotenuse2 -> cosine. Matches independent right-triangle angle-sum route and exact length calculations.',
 'existenceUniqueness':'For all0<k<1,Q=(2/w,2k/w),S=(2/w,0),U=(2,0),T=(2,2k),w=√(1+k²)>1 realizes every legal acute ray. All lengths positive;O-Q-T/O-S-U order. Exactly option4, no exceptional legal angle. Unique expression, continuously many numeric configurations.',
 'choicesCorrect':'Actual five expressions parsed as physical lengths in fresh code. Differences(1-k)/w,(ell-1)k/w,1/(kw),0,(w-k²)/(kw); four strictly positive across full domain.45 endpoint exclusion is material. No sample-only approval.',
 'figureConsistent':'Original and new topologies viewed; new raw spec10 geometry checks, strict engine pass/dropped0 and SVG byte-identical.70mm supplied layout and full new solution inspected; no mathematical pixel inference.',
 'sameCoreConceptAndProcedure':'Observed source asks which mixed trig/segment statement is correct in the quadrant with projection/tangent angles. New question uses same two-perpendicular/ray correspondence to identify one actual angle and actual adjacent/hypotenuse definition. A->O,B->S,C->Q,D->U,E->T topology preserved; no original answer solved or key used.',
 'distinctPresentation':'Whole assessment organization changes from five complete mixed sin/tan/cos claims across x/y/z to one explicit cosbeta target with five competing segment fractions. Text adds legal open angle domain/ray order; nonunit radius requires a denominator. This is substantive target/choice representation structure; radius/name substitution alone would be insufficient. Claimed inverse-target mode is not independently established and is not needed for the observed structure/representation delta.',
 'naturalKorean':'Actual rendered stem naturally identifies center/radius, order, foot, perpendicular and both angles before asking a single expression. Actual two-paragraph solution uses standard Korean terms and matches figure labels. Pure math has no forced story; source school appears only internal metadata.',
 'curriculumAppropriate':'Source-era2015 rollout rechecked directly official onOct12; six standards and five restrictions reextracted from official HWP and full matched PDF clauses. Method uses same geometric angle and one cosine definition, not forbidden complementary/inter-ratio trig identities. Bounded amendment check found no material applicable-math uncertainty; future2027 requires2022 review.',
 'allStudentSurfacesInScope':'All seven actual surfaces independently passed with explicit whole-method/choice/notation/solution/prerequisite bases; author-proposed statuses were not reused as approval.',
 'unitFamilyFit':tax['specificHold'],
 'scoreAppropriate':'Source question-only crop and JSON both print4 points, candidate4 once, MC type preserved. Objective route has noncentral-angle correspondence, actual adjacent/hypotenuse identification and nonunit-radius normalization; modest応用 proposal is plausible, no measured difficulty/registry-descriptor proof asserted.'}
checks={k:k!='unitFamilyFit' for k in check_evidence}
assert len(checks)==12 and sum(checks.values())==11
hold={'dimension':'unitFamilyFit','status':'pending','affectedQuestionNumbers':[22],
 'frozenUnitId':None,'frozenFamilyKey':None,'actualNearbyRule':'mid:3-2|삼각비|12',
 'actualNearbyLiveCapturedAt':tax['snapshot']['capturedAt'],'actualNearbyLiveCount':20,
 'reason':tax['purposeComparison'],'scope':'Exact selected Unit plus full-purpose family/rule mapping, separate from math/curriculum/source-core judgments',
 'reopeningCriteria':tax['specificHold'],'currentDBApprovalOrNewLabelInvented':False}
report={'status':'pending','questionNumber':22,'twinExternalId':candidate['twinExternalId'],
 'studentDigest':b['studentDigest'],'candidateDigest':b['candidateDigest'],'assetDigest':b['assetDigest'],'solveDigest':b['solveDigest'],
 'method':'independent-solve-then-review','verifierId':'orca-codex-exam-twin-source-identity-20261008',
 'checks':checks,'checkEvidence':check_evidence,'curriculumSurfaces':surfaces,
 'evidence':{'sealedRawCommit':'383a5f7634ce3dc8979afd35cc9e058dc0d4c4fa','rawSolveSha256':b['rawSolveFileSha256'],'rawUnedited':True,
  'newAuthorExposureAuthorizedOnlyAfterRawBinding':True,'noPriorAnswerPrivateFactsOrHelperTargetBeforeRawCommit':True,
  'bindingValidation':ref(OUT/'binding-validation.json'),'freshAnswerEquivalenceAndMath':ref(OUT/'answer-equivalence-and-math.json'),
  'freshReviewCode':ref(OUT/'review_calculations.py'),'originalRawCodeHashRetained':'242bd74e7f930c45d94830b327689a9f36783f27ac487565bae0be96c546385d',
  'officialCurriculum':ref(OUT/'curriculum-evidence.json'),'visualAndSourceCore':ref(OUT/'visual-review.json'),
  'strictEngine':ref(OUT/'strict-engine-check.json'),'expandedRender':ref(OUT/'render-preview-check.json'),'taxonomy':ref(OUT/'taxonomy-evidence.json'),
  'sourceQuestionOnly':ref(OUT/'inputs/source-question-only.json'),'sourceProvidedDigest':source['sourceContentDigest'],'sourceCanonicalDigest':b['sourceQuestionCanonicalDigest'],
  'sourceStatementDoesNotApproveCustody':'Source crop compares question concept/score/figure only; no exam header/custody/publisher permission asserted from this crop.',
  'sourceAnnotationDisclosure':'No original answer/key annotation seen in this clean supplied crop; older other-exam incidental exposure already disclosed and unused.',
  'answerFormatLimit':math['formatLimit'],'rawAndAuthorLiteralTextEqual':False,'typedRoleUnitExactAnswerMeaningEquivalent':True,
  'noLiteralOverrideOrRawNormalizationPerformed':True,'authorPrivateFactsEvaluatedAsSupplementalNotIndependentProof':True,
  'futureRepublication':'2015 source-era/content suitability only;2027 middle3 applicability requires fresh2022 review.',
  'difficulty':{'proposal':'응용','assessmentOperations':['same-angle geometric transfer','adjacent/hypotenuse choice','radius normalization','distinguish five segment expressions'],
     'objectiveTaskJudgment':'응용 proposal reasonable for this modest geometry-definition combination; independent observed task, not registry descriptor or measured student performance.',
     'measuredDifficultyClaim':False},
  'inferenceApiCalls':0,'databaseCalls':0,'mathProbabilityApproval':False},
 'dimensionResults':{'mathematics':'passed','sevenSurfaceGrade':'passed','sourceCoreAndProcedure':'passed','substantiveStructureAndRepresentation':'passed',
  'naturalKorean':'passed','scoreAndObjectiveDifficulty':'passed','exactUnitFamily':'pending','problemTypeClassification':'pending-null',
  'sourceIdentityFullCustody':'held','rights':'held','nativeCompatibility':'pending','fullReview':'pending','loadable':False},
 'holds':[hold,{'dimension':'problemType','status':'pending','affectedQuestionNumbers':[22],'reason':'Frozen problemTypeProposal=null; exact product classification not supplied/approved. No core-description label invented.'}],
 'outsideGradeRejected':False,'materialGradeHold':None,'unrelatedWholePolicyCompletenessGateAdded':False,
 'rightsApproved':False,'custodyApproved':False,'nativeProvenanceApproved':False,'overallVerified':False,'loadable':False,
 'completedScopedReview':True,'reviewedAtUtc':datetime.now(timezone.utc).isoformat()}
save('reports/q22.json',report)
save('review-summary.json',{'questionsReviewed':1,'mathematicsPassed':1,'choicesChecked':5,'wholeLegalDomainChecked':True,'gradeSurfacesPassed':7,
 'sourceCorePassed':1,'structureDeltaPassed':1,'checksPassed':11,'checksPending':['unitFamilyFit'],'reviewStatus':'pending',
 'rightsCustodyNativeLoadingApprovals':0,'rawSolveUnedited':True,'report':ref(OUT/'reports/q22.json')})
print(json.dumps({'reports':1,'checksPassed':11,'checksHeld':['unitFamilyFit'],'gradeSurfacesPassed':7,'status':'pending','rawUnedited':True}))
