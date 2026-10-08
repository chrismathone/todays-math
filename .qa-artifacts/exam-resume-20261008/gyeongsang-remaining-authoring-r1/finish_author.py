"""Bind author observations, not independent approvals. Run before the freeze only."""
from pathlib import Path
import hashlib,json,re,struct,zlib
import fitz,olefile
from PIL import Image,ImageChops
from drafts import DRAFTS,NUMBERS

OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2];ROOT=OWN.parent/'exam-extraction-resume-20261008'
assert not (OUT/'author-freeze.json').exists(), 'Frozen revision must not be edited'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text('utf8'))
def save(p,v):
    p=OUT/p;assert p.resolve().is_relative_to(OUT);p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def ref(p):return {'path':Path(p).relative_to(OUT).as_posix(),'sha256':sha(p)}
def textsha(s):return hashlib.sha256(s.encode('utf8')).hexdigest()

candidates={n:load(OUT/f'candidates/q{n:02}/q{n:02}.json') for n in NUMBERS}
curr=load(OUT/'curriculum-author-basis.json')
used={k for c in candidates.values() for k in c['curriculumReview']['standardCodes']}
used.update(['no_trig_ratio_relationships','angle_range','no_circle_proportionality','no_complex_geometry_measurement','no_formal_complex_justification'])
old={p['id']:p for p in curr['provisions'] if p['id'] in used};assert len(old)==len(used)
for kind in ['primaryPdf','primaryHwp2020_236']:assert sha(curr[kind]['path'])==curr[kind]['sha256']
hf=olefile.OleFileIO(curr['primaryHwp2020_236']['path']);data=hf.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',hf.openstream('FileHeader').read(),36)[0]&1:data=zlib.decompress(data,-15)
clean=lambda s:re.sub(r'[\s\x00-\x1f]','',s)
records=[];off=rec=para=0
while off<len(data):
    start=off;word=struct.unpack_from('<I',data,off)[0];off+=4;tag=word&1023;size=word>>20
    if size==4095:size=struct.unpack_from('<I',data,off)[0];off+=4
    value=data[off:off+size];off+=size;rec+=1
    if tag==66:para+=1
    if tag==67:records.append({'stream':'BodyText/Section0','tag':tag,'record1based':rec,'paragraph1based':para,'offset':start,'text':value.decode('utf-16le')})
pdf=fitz.open(curr['primaryPdf']['path']);pages=[clean(p.get_text()) for p in pdf]
fresh=[]
for key,p in old.items():
    hits=[r for r in records if clean(r['text'])==clean(p['hwp']['text'])];assert len(hits)==1,(key,len(hits))
    pp=[i+1 for i,t in enumerate(pages) if clean(hits[0]['text']) in t];assert len(pp)==1,(key,pp)
    fresh.append({'id':key,'hwp':hits[0],'pdfPhysicalPage1based':pp[0],'pdfPrintedPage':pp[0]-4,'wholeClausePdfMatch':True})
curr['provisions']=fresh;curr['currentAuthorProvisionAnchorsReextracted']=True
curr['unusedInheritedProvisionsAreNotThisAuthorEvidence']=True
curr.pop('preExposureMethodEvidence',None)
seed=ROOT/'prisma/seed-data/units.ts';seedtext=seed.read_text('utf8')
sections=['좌표','일차방정식','합동','내각','이등변삼각형','피타고라스','제곱근','실수의 계산','삼각비']
seedrows=[]
for m in re.finditer(r'\{[^{}]*\bgrade:\s*"[^"]+"[^{}]*\bsection:\s*"([^"]+)"[^{}]*\}',seedtext):
    if any(s in m[1] for s in sections):
        seedrows.append({'path':seed.as_posix(),'sha256':sha(seed),'startLine1based':seedtext[:m.start()].count('\n')+1,
         'endLine1based':seedtext[:m.end()].count('\n')+1,'section':m[1],'text':m[0]})
curr['currentAuthorPrerequisiteSeedRecords']=seedrows
save('curriculum-author-basis.json',curr);provs={p['id']:p for p in fresh}
math={r['questionNumber']:r for r in load(OUT/'author-calculations.json')['rows']}
fig={r['questionNumber']:r for r in load(OUT/'figure-author-checks.json')['rows']}
layout=load(OUT/'preview-layout.json');views=[]
for row in layout['results']:
    n=row['questionNumber'];assert not row['mathOrTableOverflow'];assert abs(row['actualColumnWidthMm']-70)<.01
    for w in row['actualSvgWidthsMm']:assert abs(w-70)<.01
    sp=OUT/row['studentPng']['path'];ap=OUT/row['expandedAuthorPng']['path']
    assert sha(sp)==row['studentPng']['sha256'] and sha(ap)==row['expandedAuthorPng']['sha256']
    student=Image.open(sp).convert('RGB');author=Image.open(ap).convert('RGB')
    # The independently exported student pane is the pixel-identical upper pane actually viewed in author PNG.
    prefix_equal=student.width==author.width and ImageChops.difference(student,author.crop((0,0,student.width,student.height))).getbbox() is None
    assert prefix_equal,n
    views.append({'questionNumber':n,'directlyViewedWithViewImage':ref(ap),'studentPane':ref(sp),'studentPanePixelIdenticalToViewedPrefix':prefix_equal,
      'actualColumnWidthMm':row['actualColumnWidthMm'],'actualSvgWidthsMm':row['actualSvgWidthsMm'],
      'viewedItems':['whole student stem','fresh tables','all choices or all written parts','all new embedded figures','chosen new answer','entire expanded new solution'],
      'legibilityAuthorObservation':'Labels, radicals, fractions, degree marks and table boundaries readable; no clipping, orphan final table row or math/table overflow observed.',
      'mathematicalPixelMeasurementUsed':False,'independentFigureOrContentApproval':False})
layout['authorImageInspectionPending']=False;layout['authorOnlyVisualInspection']=True
save('preview-layout.json',layout)
save('visual-inspection.json',{'method':'direct view_image inspection of all15 current expanded author PNGs; pixel-prefix check only establishes student-pane identity',
 'rows':views,'authorOnly':True,'newVectorFiguresViewedAt70mm':12,'expandedSolutionsViewed':15,'studentPanesViewed':15,'pixelsAreMathematicalOracle':False,'nativeReaderParity':False})

method_notes={
1:'PQ=25, sinP=7/25 gives actual QR=7. PR=24 is a positive existence witness, not a new requested ratio.',
2:'Positive coordinate a is the actual adjacent length PR; a/20=4/5 gives16. b=12 witnesses existence. Axes and ordered pairs are prior middle1 coordinates, not vectors or a distance formula.',
3:'13²−10²=69>0; positive QR=√69, then definition QR/PR=√69/10. Both requested records checked.',
4:'Rounded lengths are records, not exact geometric lengths. Divide OH=7.6604 and AD=8.3910 separately by radius10, then round to4 decimal places. Definitions are in two right triangles; no identity between ratios.',
5:'Four actual table entries give1.3440 and1.3686; prescribed ordered difference is−0.0246. All other table entries regenerated and checked. Exact value of the underlying transcendental expression is not the requested result.',
6:'tan row0.7813 occurs only at38; cos row0.7771 only at39; y−x=1. Two independent table angles; no relation between tan and cos at a general angle.',
7:'Both acute angles45 and equal legs12; 12+12−12√2=24−12√2>0. Special45 definition uses actual hypotenuse; all units cm.',
8:'Fixed60/45 product√3/2 and fixed45/30 coefficient√6/6>0 imply unique positive k=3√2/2. Linear equation over concrete nonzero constants, not a trigonometric identity.',
9:'x+2x+90=180 fixes P30,Q60 before evaluating the expression. Explicit sin60=√3/2, cos60=1/2, tan60=√3 multiply to3/4. No simplification sinQ·cosQ·tanQ for an arbitrary Q is assessed or needed.',
16:'Altitude PH=12 sin60=6√3; (QR)(6√3)/2=36√3 gives QR12. QH6 proves the specified internal foot exists. Student solution derives height and uses elementary area, not an unexplained general sine area formula.',
17:'tan15=QH/PH; table record gives PH=2.7/0.2679≈10.0784m→10.1m. Exact geometry2.7/tan15≈10.0765m rounds the same. Actual SVG angle is15; approximation is declared.',
18:'CF8; EH=h, FH=h, HC=√3h yield h=4(√3−1)>0; areaEFC16(√3−1). Full areaABC24√3 and BC=t,AB=t/√3 imply t²144, positive t12, BF4. E and H are internal, but whole overlapping-area inverse assessment complexity is a material curricular hold.',
19:'Actual positive lengths QR=3x/5, PR=4x/5 follow cos definition plus Pythagoras; area6x²/25=24 fixes x10. All three subparts and lengths6,8cm verified. Task assesses physical lengths/area scale, not deriving an unknown sine from a cosine.',
20:'SSS of PQH/PRH and equal supplementary angles establishes the perpendicular; equal vertex halves give30. Positive height√(100−25)=5√3. Three ratios read directly from actual sides QH5,PH5√3,PQ10, without complementary-angle or inter-ratio identities.',
21:'Internal perpendicular atH; OH18cos60=9m, PH18sin60=9√3m; HQ²468−243225 gives positive15m; OQ9+15=24m. Internal order eliminates exterior branch. No sine/cosine law, dot product or addition formula.'}
notation_notes={
2:'R(0,0),P(a,0),Q(0,b),a,b>0 use middle1 coordinates and equality of positive axis coordinate/length only.',
3:'Corrected draft superscript comma typo before freeze: QR². Positive square root and tan definition only.',
4:'40° within0..90; fixed rounded lengths carry4-decimal approximation convention, not a general circle proportion theorem.',
6:'x,y explicitly range over the finite supplied angle-number columns37..40; x°/y° notation does not require trigonometric functions or general identities.',
8:'k>0 is a scalar in a linear equation of fixed special-value constants.',
9:'Q is first fixed at60°. The visible product of three named ratios is evaluated by three special values; its generic identity is not a student procedure.',
18:'h,t are positive actual lengths in cm. One linear equation and a positive square root are required; no advanced coordinate or vector notation.',
19:'x>0 is a physical hypotenuse length; x² is area-scale algebra. Pythagoras is written on actual sides, not an equation between ratios.',
20:'α is the30° angle produced by the equilateral split; SSS, perpendicular and fractions of actual sides are middle1–3 notation.',
21:'O-H-Q inside ordering is an explicit condition. All lengths positive in m; radicals and Pythagoras stay within middle3.'}
hold={'status':'pending','scope':'q18 only: whole-student inverse overlapping-area assessment',
 'officialProvision':provs['no_complex_geometry_measurement'],
 'primaryOfficialSource':curr['primaryHwp2020_236'],'correspondingOfficial2015Pdf':curr['primaryPdf'],
 'materialQuestion':'Whether recovering a side from an overlap quadrilateral area via EFH/ECH height reconstruction, area complement and a positive quadratic scale remains an excluded complex transformed plane-area problem. Providing H does not establish allowance.',
 'whyPendingNotApproved':'Elementary steps and a correct numerical answer do not settle the official scope of the intended multi-stage measurement assessment. Author cannot supply independent grade judgment.',
 'whyNotDefinitivelyRejectedHere':'The official provision has no complexity threshold or explicit example resolving this exact configuration. No direct official classification of this whole inverse route was located in the bounded provisions.',
 'reopeningCriteria':'Independent whole-route review grounded in a direct official explanatory example/scope interpretation of this restriction; if it applies, reject the source-faithful twin. A simple unrelated side-length problem would change the assessed core and would require a new-source decision.',
 'unrelatedWholePolicyGapAdded':False,'familyExistenceOrModelConfidenceAsAllowance':False}
save('q18-curriculum-hold.json',hold)
schema=ROOT/'prisma/schema.prisma';schema_lines=schema.read_text('utf8').splitlines()
type_lines=[{'line1based':i+1,'text':s} for i,s in enumerate(schema_lines) if ('problemType' in s and ('@map' in s or '계산' in s))]
save('classification-limits.json',{'schema':{'path':schema.as_posix(),'sha256':sha(schema),'records':type_lines},
 'problemTypeProposal':None,'problemTypeStatus':'pending','reason':'Actual product string axis is separate from questionType; no task-to-axis rule checked. A descriptive core string is not a valid substitute.',
 'familyProposals':{'q01':'mid:3-2|삼각비|02','q16':'mid:3-2|삼각비의 활용|08'},'familyNullQuestions':[n for n in NUMBERS if not candidates[n]['metadata']['assignment']['familyKey']],
 'unitRecordsDatedOnly':True,'familyAndProblemTypeApproval':False,'fixedDifficultyDescriptorIsMeasuredDifficulty':False})

source=load(OUT/'source-question-only/selected15.json');sourceby={q['number']:q for q in source['questions']}
dispositions=[]
for n,c in candidates.items():
    d=DRAFTS[n];m=math[n];tag=f'q{n:02}';view=next(v for v in views if v['questionNumber']==n)
    currentpub=c['content']+'\n'+'\n'.join(c['choices'])+'\n'+c['answer']+'\n'+c['solution']
    assert '경상' not in currentpub
    c['curriculumReview']['officialProvisions']=[provs[k] for k in c['curriculumReview']['standardCodes']]
    c['curriculumReview']['restrictionClauses']=[provs[k] for k in ['no_trig_ratio_relationships','angle_range','no_circle_proportionality','no_complex_geometry_measurement','no_formal_complex_justification']]
    c['curriculumReview']['sourceEraBasis']='Actual2025 middle3 uses2015; middle3 rollout of2022 begins2027; future republication needs its own review.'
    c['curriculumReview']['preauthorGate']='pending-material-q18-complex-measurement' if n==18 else 'author-method-proposed-independent-review-pending'
    if n==18:c['curriculumReview']['materialHold']=ref(OUT/'q18-curriculum-hold.json')
    c['metadata']['problemTypeProposal']=None;c['metadata']['problemTypeStatus']='pending'
    c['metadata']['problemTypeEvidence']=ref(OUT/'classification-limits.json')
    c['metadata']['authorFigureEvidence']=ref(OUT/'figure-author-checks.json')
    c['metadata']['authorVisualEvidence']=ref(OUT/'visual-inspection.json')
    c['metadata']['officialAuthorCurriculumEvidence']=ref(OUT/'curriculum-author-basis.json')
    prerequisite_records=[r for r in seedrows if any(s in r['section'] for s in ['삼각비','제곱근','실수의 계산'])]
    if n in [3,18,19,20,21]:prerequisite_records += [r for r in seedrows if '피타고라스' in r['section']]
    if n==2:prerequisite_records += [r for r in seedrows if '좌표' in r['section']]
    if n in [7,20]:prerequisite_records += [r for r in seedrows if '합동' in r['section'] or '이등변삼각형' in r['section']]
    if n in [8,9,18]:prerequisite_records += [r for r in seedrows if '일차방정식' in r['section'] or '내각' in r['section']]
    surface_status='pending-material-restriction' if n==18 else 'author-observed-proposed'
    surfaces={
      'stem':{'status':surface_status,'contentTextSha256':textsha(c['content']),'observation':d['delta'],'wholeMethod':method_notes[n]},
      'choices':{'status':surface_status,'textArraySha256':textsha(json.dumps(c['choices'],ensure_ascii=False)),'actualAllChoices':m['actualAllChoices'],
        'observation':'All five exact values/ordered pairs were parsed with code and compared against every requested target; one winning option. Wrong choices require no new grade prerequisite.' if c['choices'] else 'No multiple-choice options. All three written subparts are separately specified and checked.'},
      'figuresAndTables':{'status':surface_status,'rawSpecAndSvgRelations':fig.get(n),'visualEvidence':view,
        'observation':'Every needed length/angle/order given in text; newly computed engine geometry is not a substitute for a given. Fresh tables organize new records and preserve paragraphs.'},
      'notation':{'status':surface_status,'observation':notation_notes.get(n,'Fixed acute angles, physical lengths and simple fractions/radicals. No upper-grade function/vector/calculus notation in student surfaces.')},
      'answer':{'status':surface_status,'textSha256':textsha(c['answer']),'newExactRequestedValues':m['newExactRequestedValues'],
        'observation':'New single chosen circled mark bound to the checked option.' if c['choices'] else 'All written parts, actual units, ordered lengths and required q20 perpendicular proof are retained in full answer/solution.'},
      'studentSolution':{'status':surface_status,'textSha256':textsha(c['solution']),'legitimateStudentProcedure':d['procedure'],'actualMathRoute':method_notes[n],
        'generalTrigIdentityOrSineCosineLawUsed':False,'originalKeyAgreementUsed':False},
      'prerequisites':{'status':surface_status,'officialStandards':[provs[k] for k in c['curriculumReview']['standardCodes']],
        'actualPrerequisiteSeedRecords':prerequisite_records,'boundary':'Source-era2015 middle3 only; no probability/registry permit. New elementary coordinate representation q02 is supported by9수03-01. Whole route remains subject to independent review.'}}
    check={'schemaVersion':1,'questionNumber':n,'authorId':c['authorId'],'method':'author-calculation-and-seven-surface-preparation',
      'authorOnly':True,'independentVerifier':False,'sourceQuestionId':c['sourceReference']['externalId'],'twinExternalId':c['twinExternalId'],
      'sourceQuestionOnlyRecord':sourceby[n],'sourceWholePacketSHA256':source['packet']['sha256'],
      'gradeDisposition':surface_status,'sourceCoreAndActualMethod':{'sharedConcept':d['core'],'sourceObservedQuestion':c['variantDelta']['before'],
        'newMethod':method_notes[n],'sourceCorePreservationStatus':'author-proposed-independent-review-pending'},
      'substantiveDelta':c['variantDelta'],'score':c['score'],'newSubpartRubric':c['metadata']['newSubpartRubric'],
      'mathEvidence':m,'calculationProofFile':ref(OUT/'author-calculations.json'),'calculationCode':ref(OUT/'author_math.py'),
      'sevenStudentSurfaces':surfaces,'officialRestrictions':[provs[k] for k in ['no_trig_ratio_relationships','angle_range','no_complex_geometry_measurement','no_formal_complex_justification']],
      'taxonomy':c['metadata']['assignment'],'problemType':{'proposal':None,'status':'pending','evidence':ref(OUT/'classification-limits.json')},
      'objectiveDifficultyProposal':{'label':d['difficulty'],'reason':d['procedure'],'status':'author-proposed','registryDescriptorAsProof':False,'studentPerformanceMeasured':False},
      'naturalKoreanAuthorObservation':'Actual expanded layout read; exact input/target order and units stated. Pure mathematics stays mathematical; q17 changes distance input/target in a natural ramp context; q21 uses consistent fictional school.',
      'materialHold':hold if n==18 else None,
      'allFinalApprovals':{'independentMath':False,'independentWholeGrade':False,'sourceCore':False,'unitFamily':False,'rights':False,'nativeProvenance':False,'loadable':False}}
    p=Path('author-checks')/f'{tag}.json';save(p,check)
    c['metadata']['authorSevenSurfaceEvidence']=ref(OUT/p)
    save(Path('candidates')/tag/f'{tag}.json',c)
    dispositions.append({'sourceQuestionNumber':n,'sourceQuestionId':c['sourceReference']['externalId'],'twinExternalId':c['twinExternalId'],
     'status':'held-material-curriculum' if n==18 else 'authored-proposed-independent-review-pending',
     'candidate':ref(OUT/f'candidates/{tag}/{tag}.json'),'sourceScore':c['score'],'gradeDisposition':surface_status,
     'specificMaterialHolds':[hold] if n==18 else [],'familyProposal':c['metadata']['assignment']['familyKey'],'familyAssignmentApproved':False,
     'problemTypeProposal':None,'problemTypeStatus':'pending','independentSolveAndReviewPending':True,'rightsApproved':False,'nativeProvenanceApproved':False,'loadable':False})
save('dispositions.json',dispositions)
print(json.dumps({'authorChecks':len(dispositions),'sevenSurfaces':len(dispositions)*7,'materialHoldQuestions':[18],'independentApprovals':0,'currentOfficialProvisionsReanchored':len(fresh)}))
