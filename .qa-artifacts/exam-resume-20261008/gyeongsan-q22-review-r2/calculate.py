"""Fresh exact solve of only the supplied q22-r2 student input.
No authored/private facts, previous answer, original key or new helper target.
Developer parameters below are physical length ratios, not a student trig identity.
"""
from pathlib import Path
import hashlib,json,re
import sympy as S
OUT=Path(__file__).resolve().parent;BLIND=OUT/'blind'
SOLVER='orca-codex-exam-twin-source-identity-20261008'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text('utf8'))
def save(name,data):
    p=OUT/name;assert p.resolve().is_relative_to(OUT);assert not p.exists(), 'Raw solve/code proof must not be overwritten'
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def canon(v):return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def enc(v):
    if isinstance(v,S.MatrixBase):return [enc(x) for x in v]
    if isinstance(v,S.Basic):return str(v)
    if isinstance(v,dict):return {str(k):enc(x) for k,x in v.items()}
    if isinstance(v,(tuple,list)):return [enc(x) for x in v]
    return v
problem=load(BLIND/'student-problems.json')[0]
payload={k:v for k,v in problem.items() if k!='studentDigest'}
assert hashlib.sha256(canon(payload).encode('utf8')).hexdigest()==problem['studentDigest']
disclosure=load(OUT/'access-disclosure.json');assert disclosure['freshBlindSolvePermittedByObservedAccess'] and not disclosure['priorQ22R2AuthorAnswerAccess']

# k=SQ/OS, with0<k<1 from a ray below the45-degree ray.
# ell=OT/OQ>1 from O-Q-T order. Both are independent geometry parameters.
k,ell=S.symbols('k ell',positive=True);w=S.sqrt(1+k*k)
os=2/w;sq=2*k/w;ut=ell*sq;target=sq/2
values={'OS':os,'SQ':sq,'UT':ut,'2':S.Integer(2)}
forms=[(1-k)/w,(ell-1)*k/w,1/(k*w),S.Integer(0),(w-k*k)/(k*w)]
certificates=[
 {'difference':'(1-k)/sqrt(1+k²)','positiveFactors':['1-k>0','sqrt(1+k²)>0'],'domainProof':'0<k<1'},
 {'difference':'(ell-1)*k/sqrt(1+k²)','positiveFactors':['ell-1>0','k>0','sqrt(1+k²)>0'],'domainProof':'ell=OT/OQ>1 by O-Q-T ordering'},
 {'difference':'1/(k*sqrt(1+k²))','positiveFactors':['1>0','k>0','sqrt(1+k²)>0'],'domainProof':'0<k<1'},
 {'difference':'0','domainProof':'identically equal for the whole legal domain'},
 {'difference':'(sqrt(1+k²)-k²)/(k*sqrt(1+k²))','positiveFactors':['sqrt(1+k²)>1>k²','k>0','sqrt(1+k²)>0'],'domainProof':'0<k<1 implies k²<1'}]
options=[]
for i,text in enumerate(problem['choices']):
    match=re.fullmatch(r'\$\\dfrac\{(OS|UT|SQ|2)\}\{(OS|UT|SQ|2)\}\$',text);assert match,text
    value=S.simplify(values[match[1]]/values[match[2]]);difference=S.simplify(value-target)
    assert S.simplify(difference-forms[i])==0,(i,difference,forms[i])
    options.append({'index1based':i+1,'choiceMark':'①②③④⑤'[i],'actualStudentExpression':text,
       'exactExpressionFromActualLengths':str(value),'targetCosBetaFromRightTriangle':str(target),
       'differenceFromTarget':str(difference),'positiveOrZeroCertificate':certificates[i],
       'equalOnEntireLegalDomain':i==3,'thisAlternativeHasNoEqualityAtAnyLegalAngle':i!=3,'units':'dimensionless'})
assert [r['index1based'] for r in options if r['equalOnEntireLegalDomain']]==[4]

# Construct an exact nondegenerate figure for EVERY0<k<1.
# U at the illustrated quadrant endpoint implies OU2 and ell=w>1.
points={'O':S.Matrix([0,0]),'S':S.Matrix([os,0]),'Q':S.Matrix([os,sq]),'U':S.Matrix([2,0]),'T':S.Matrix([2,2*k])}
def distance(a,b):
    d=points[a]-points[b];return S.simplify(S.sqrt(sum(x*x for x in d)))
lengths={a+b:distance(a,b) for a,b in [('O','Q'),('O','U'),('O','S'),('S','Q'),('O','T'),('U','T'),('Q','T'),('S','U')]}
assert lengths['OQ']==2 and lengths['OU']==2
assert S.simplify(lengths['OS']**2+lengths['SQ']**2-4)==0
assert S.simplify(points['T']-w*points['Q'])==S.zeros(2,1)
assert S.simplify(lengths['UT']/lengths['OT']-target)==0
assert S.simplify(lengths['QT']**2-(2*(w-1))**2)==0
assert S.simplify(lengths['SU']**2-(2*(1-1/w))**2)==0
# Both right-hand lengths are positive because k>0 implies w>1.
# This supplies the sign branch that a generic symbolic sqrt cannot infer.
lengths['QT']=2*(w-1);lengths['SU']=2*(1-1/w)
geometry={
 'parameters':{'k':'actual SQ/OS, 0<k<1','ell':'actual OT/OQ>1, hence UT=ell*SQ by similar right triangles','w':'sqrt(1+k²)>1'},
 'exactExistenceWitnessForEveryLegalK':enc(points),'exactWitnessLengths':enc(lengths),
 'witnessChecks':['OQ=OU=2','Q lies on the quadrant, both coordinates positive','OS²+SQ²=4',
 'O,Q,T collinear with T=w*Q and w>1','QS and UT vertical, OU and OS horizontal; both right angles verified',
 'OS>0,SQ>0,UT>0,QT=2(w-1)>0,SU=2(1-1/w)>0','O-S-U and O-Q-T order are nondegenerate',
 'alpha between0 and45 follows 0<SQ/OS=k<1; beta=90-alpha lies between45 and90',
 'UT/OT=SQ/OQ=SQ/2 by the two corresponding right-triangle cosine definitions'],
 'angleCorrespondenceStudentProof':'TQ is the same ray as TO because O-Q-T; triangleOUT right atU gives beta+alpha=90. TriangleOQS right atS has angleOQS=beta, so adjacent leg is QS and hypotenuse is QO.',
 'fullDomainProofIsNotNumericalSampling':True,'actualSVGCoordinatesOrPixelsAsOracle':False}
samples=[]
for q in [S.Rational(1,1000),S.Rational(1,2),S.Rational(999,1000)]:
    f={k:q,ell:w.subs(k,q)};gaps=[S.simplify(form.subs(f)) for form in forms]
    assert gaps[3]==0 and all(gaps[i]>0 for i in [0,1,2,4])
    samples.append({'kExact':str(q),'targetExact':str(target.subs(k,q)),'allChoiceDifferencesExact':enc(gaps),
       'onlySupplementalSanityCheckNotDomainProof':True})
proof={'method':'fresh exact length geometry and actual-five-expression comparison','studentDigest':problem['studentDigest'],
 'inputSHA256':sha(BLIND/'student-problems.json'),'svgSHA256':sha(BLIND/'figures/q22-1.svg'),
 'codeSHA256':sha(__file__),'fullDomain':{'alpha':'0°<alpha<45°','beta':'45°<beta<90°',
 'k':'0<k=SQ/OS<1','ell':'OT/OQ>1','allFiveExpressionsDefined':True,'SQDenominatorsStrictlyPositive':True,
 'boundaryCasesExcluded':['alpha0 makes SQ0 and a degenerate T angle; reciprocal options undefined','alpha45 permits the two equal legs, but is outside the stated domain']},
 'geometry':geometry,'allFiveActualChoices':options,'supplementalExactSamples':samples,
 'requestedUniqueness':'Unique expression④ on the full legal domain; no single numerical angle, cos value or all lengths are fixed by the input.',
 'dimensionlessAnswer':True,'noExplicitLengthUnitSupplied':'Radius2 and all drawn lengths use one common unit; no cm/m invented.',
 'originalKeyAgreementUsed':False,'authorPrivateFactsUsed':False,'newHelperTestTargetUsed':False,
 'studentMethodRequiresTrigRatioIdentities':False,'calculationAPIOrInferenceCalls':0}
save('proofs/q22-exact-calculations.json',proof)
solution=r'''삼각형 $OUT$는 $U$에서 직각이다. $O,Q,T$가 이 순서로 한 직선 위에 있으므로 $TQ$와 $TO$는 같은 반직선이다. 따라서 $\angle UTQ=\angle UTO=\beta$이고, 삼각형 $OUT$의 두 예각에서 $\alpha+\beta=90^\circ$이다.

삼각형 $OQS$는 $S$에서 직각이고 $\angle QOS=\alpha$이므로 $\angle OQS=90^\circ-\alpha=\beta$이다. 이 삼각형에서 각 $OQS$의 이웃변은 $QS$, 빗변은 반지름 $QO=2$이다. 코사인의 정의에 따라 $\cos\beta=\frac{QS}{QO}=\frac{SQ}{2}$이다. 따라서 정답은 ④이다.

다른 네 식도 주어진 전체 각 범위에서 일치하지 않는다. $0^\circ<\alpha<45^\circ$이므로 $0<SQ<OS$이다. 이를 도형으로 확인하려면 $O$에서 $OU$와 $45^\circ$를 이루는 반직선과 직선 $SQ$의 교점을 $V$라 한다. 삼각형 $OSV$는 직각이등변삼각형이어서 $SV=OS$이고, $S,Q,V$가 이 순서로 놓이므로 $SQ<SV=OS$이다. 또 $SQ$는 빗변 $OQ=2$보다 짧아 $0<SQ<2$이다.

① $\frac{OS}{2}>\frac{SQ}{2}$이므로 다르다. 두 식이 같으려면 두 직각변이 같고 $\alpha=45^\circ$여야 하므로 주어진 범위에서도 제외된다.

② 큰 직각삼각형에서는 $\cos\beta=\frac{UT}{OT}$이다. $O,Q,T$의 순서 때문에 $OT>OQ=2$이고 $UT>0$이므로 $\frac{UT}{2}>\frac{UT}{OT}=\cos\beta$이다.

③ $\frac{2}{SQ}>1$인 반면 $\frac{SQ}{2}<1$이므로 다르다.

⑤ $\frac{OS}{SQ}>1$인 반면 $\frac{SQ}{2}<1$이므로 다르다.

④만 모든 허용된 각에서 맞는다. 답은 같은 길이 단위끼리 나눈 비이므로 단위가 없다. 각이나 길이 하나의 숫자값을 결정할 필요는 없다.'''
figure=load(OUT/'figure-render-receipt.json')
evidence={'stage':'blind-solve-before-new-author-answer-exposure','solverIndependentOfThisCandidateAuthor':True,
 'accessDisclosure':{'path':'access-disclosure.json','sha256':sha(OUT/'access-disclosure.json')},
 'priorExposureToThisR2AuthorAnswersOrPrivateFacts':False,'newHelperTestTargetAccess':False,
 'inputReceipt':{'path':'input-receipt.json','sha256':sha(OUT/'input-receipt.json')},
 'studentDigestRecomputedFromExactStudentPayload':True,
 'rawInputHashes':{'studentProblems':sha(BLIND/'student-problems.json'),'manifest':sha(BLIND/'blind-manifest.json'),'brief':sha(BLIND/'SOLVE-BRIEF.md'),'figure':sha(BLIND/'figures/q22-1.svg')},
 'freshCode':{'path':'calculate.py','sha256':sha(__file__)},'exactProof':{'path':'proofs/q22-exact-calculations.json','sha256':sha(OUT/'proofs/q22-exact-calculations.json')},
 'chosenChoiceIndex1based':4,'requestedRole':'cos beta expressed by drawn line lengths','exactRequestedExpression':r'\frac{SQ}{2}',
 'allFiveChoices':options,'fullDomain':proof['fullDomain'],'existenceAndUniqueness':proof['requestedUniqueness'],
 'positiveLengthsAndOrder':geometry,'unit':'dimensionless','figureView':figure,
 'actualFigureObservation':'Direct view_image of only the supplied student SVG rendered at70mm: Q lies on the arc, O-Q-T line, S and U right-angle marks, alpha atO and beta atT, U at quadrant endpoint, O-S-U order. All labels readable; beta arc belongs to TU/TQ. No coordinates/pixel distance used to derive math.',
 'sevenStudentSurfaces':{
  'stem':'Quarter-circle radius2, line order and two perpendiculars determine the equal angle in triangleOQS. The open angle bound keeps both triangles nondegenerate.',
  'choices':'All five actual expressions checked symbolically over 0<k<1 and ell>1; exactly④ is equal. Four alternatives strictly larger, no exceptional legal alpha.',
  'figuresAndTables':'One supplied SVG; actual70mm view has all O,Q,S,T,U and alpha,beta/right marks. No table or extra student asset.',
  'notation':'Only Greek angle names, acute-degree bound and elementary length ratios; no general trig function identities/addition or upper-grade notation needed.',
  'answer':'One circled option④ with exact length-ratio value SQ/2; dimensionless, not an invented numerical cos value.',
  'studentSolution':'Two right-triangle angle sums/line correspondence and the cosine adjacent/hypotenuse definition. Optional45-degree isosceles construction checks the four alternatives without a trig identity.',
  'prerequisites':'Middle1 triangle angles/right angles, middle2 right-isosceles triangle property, middle3 trigonometric ratio definition. Developer algebra/coordinate witness is supplemental, not a demanded student method.'},
 'curriculumBoundedObservation':{'basis':'2015 middle3','previouslyReadOfficialDefinitions':['9수04-05 polygon/triangle angle properties','9수04-10 isosceles properties','9수04-17 simple trigonometric ratio definitions'],
  'generalInterRatioOrComplementaryTrigIdentityUsed':False,'sineCosineLawOrAdditionFormulaUsed':False,'outsideGradeRequiredMethodDetected':False,
  'authorSolutionOrSevenSurfaceFinalGradeNotYetSeen':True,'fullContentFamilyRightsNativeLoadingApproval':False},
 'limits':['The supplied author answer/solution/private figure spec/facts and helper target were not read; these remain for a later authorized review.',
 'This stage proves only the supplied student problem and fresh solver answer; no source/core/family/custody/rights/native/loading approval.',
 'Allowed angles/configurations form a continuum; requested expression has a unique correct choice, not a unique numeric value.'],
 'originalAnswerApproval':False,'inferenceApiCalls':0}
raw={'studentDigest':problem['studentDigest'],'solverId':SOLVER,'answer':r'④, $\cos\beta=\dfrac{SQ}{2}$',
 'solution':solution,'evidence':evidence,'status':'solved'}
save('solve/q22.json',raw)
save('raw-output-hashes.json',{'studentDigest':problem['studentDigest'],'rawSolve':{'path':'solve/q22.json','sha256':sha(OUT/'solve/q22.json')},
 'exactProof':{'path':'proofs/q22-exact-calculations.json','sha256':sha(OUT/'proofs/q22-exact-calculations.json')},
 'freshCode':{'path':'calculate.py','sha256':sha(__file__)},'studentInput':{'path':'blind/student-problems.json','sha256':sha(BLIND/'student-problems.json')},
 'studentFigure':{'path':'blind/figures/q22-1.svg','sha256':sha(BLIND/'figures/q22-1.svg')},
 'answerExposureBeforeRawCommit':False,'rawFilesMustNotBeReformattedAfterExposure':True})
print(json.dumps({'questionNumber':22,'studentDigest':problem['studentDigest'],'status':'solved','chosenChoice':4,'allFiveExpressionsChecked':True,'fullLegalDomainProved':True,'exposed':False}))
