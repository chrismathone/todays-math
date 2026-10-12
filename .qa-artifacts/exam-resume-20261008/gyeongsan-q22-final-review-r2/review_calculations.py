"""New final-review calculations; never import/edit the sealed raw solver script."""
from pathlib import Path
import json,hashlib,math,re
import sympy as S
OUT=Path(__file__).resolve().parent
def load(p):return json.loads(Path(p).read_text('utf8'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
candidate=load(OUT/'inputs/package/private/q22/candidate.json');raw=load(OUT/'inputs/blind/solve/q22.json')
k,ell=S.symbols('k ell',positive=True);w=S.sqrt(1+k*k)
length={'OS':2/w,'SQ':2*k/w,'UT':2*ell*k/w,'2':S.Integer(2)};target=length['SQ']/2
positiveforms=[(1-k)/w,(ell-1)*k/w,1/(k*w),S.Integer(0),(w-k*k)/(k*w)]
certs=['1-k>0 and w>0','ell-1>0,k>0,w>0','k>0,w>0','exact zero','w>1>k² and k,w>0']
rows=[]
for i,text in enumerate(candidate['choices']):
 m=re.fullmatch(r'\$\\dfrac\{(OS|SQ|UT|2)\}\{(OS|SQ|UT|2)\}\$',text);assert m,text
 value=S.simplify(length[m[1]]/length[m[2]]);difference=S.simplify(value-target)
 assert S.simplify(difference-positiveforms[i])==0
 rows.append({'choiceIndex1based':i+1,'actualText':text,'physicalLengthNumerator':m[1],'physicalLengthDenominator':m[2],
 'exactPhysicalLengthExpression':str(value),'exactDifferenceFromCosBeta':str(difference),'wholeDomainSignProof':certs[i],
 'equalForEveryLegalAngle':i==3,'strictlyGreaterAtEveryLegalAngle':i!=3})
assert candidate['answer']=='④';assert [r['choiceIndex1based'] for r in rows if r['equalForEveryLegalAngle']]==[4]
rawmark=re.findall('[①②③④⑤]',raw['answer']);assert rawmark==['④']
assert raw['evidence']['chosenChoiceIndex1based']==4 and raw['evidence']['requestedRole']=='cos beta expressed by drawn line lengths'
assert raw['evidence']['exactRequestedExpression']==r'\frac{SQ}{2}'
selected=rows[3];assert selected['physicalLengthNumerator']=='SQ' and selected['physicalLengthDenominator']=='2'
proof={'codeSha256':sha(__file__),'sealedRawSolveSha256':sha(OUT/'inputs/blind/solve/q22.json'),
 'method':'Meaning comparison of separately declared target role, chosen mark/index and exact numerator/denominator; whole-domain physical geometry calculation. No normalized-string-as-algebra comparison.',
 'rawAnswerPreserved':raw['answer'],'authoredAnswerPreserved':candidate['answer'],'requestedRole':'cosBeta',
 'rawChosenMarks':rawmark,'rawChosenIndex':4,'authoredChosenMark':'④','authoredChosenIndex':4,
 'selectedExpressionRoleUnitValue':{'role':'cosBeta','unit':'dimensionless','exactNumerator':'SQ','exactDenominator':2,'geometryReason':'parallel QS/UT, O-Q-T same ray, angleOQS=angleUTQ=beta; QO=radius2'},
 'sameMarkAndExactRequestedValue':True,'literalRawAnswerAndAuthoredAnswerEqual':raw['answer']==candidate['answer'],
 'formatLimit':'A comparator expecting only a circled mark may reject the raw worked-value suffix. Preserve bytes; use this typed role/index/physical-length evidence. No global answer string normalization is an algebra proof.',
 'allFiveActualExpressions':rows,'allDomain':{'alpha':'0<alpha<45 degrees','beta':'45<beta<90 degrees','k':'0<SQ/OS<1','ell':'OT/OQ>1',
 'nonzeroDenominators':True,'positiveLengths':True,'boundary45ExcludedForUniqueChoice':True},
 'authorStudentSolutionStepReview':[
 {'claim':'QS and UT perpendicular to OU imply parallel','checked':'Same two perpendicular directions in plane; middle1 line relation'},
 {'claim':'angleOQS=angleUTQ=beta','checked':'QO and TQ are same directed down-left direction by O-Q-T; QS and TU are both toward baseline and parallel. Thus same angle, not its supplement.'},
 {'claim':'In right triangleOSQ the adjacent side atQ isSQ and hypotenuseOQ is2','checked':'S is right-angle vertex; Q lies on radius2 arc; target angle atQ isbeta'},
 {'claim':'cosbeta=SQ/OQ=SQ/2 and option4','checked':'One cosine definition in actual right triangle; all five expressions checked over full domain'}],
 'existenceForEachLegalAngle':'Original sealed proof constructs Q=(2/w,2k/w),S=(2/w,0),U=(2,0),T=(2,2k). All0<k<1;OQ2,T=wQ,w>1. This review recomputes physical ratio expressions, signs and spec geometry independently.',
 'requestedUniqueExpressionButNumericalConfigurationNotUnique':True,
 'formalTrigIdentitiesSineCosineLawAdditionFormulaUsed':False,'pixelCoordinatesAsQuestionValueUsed':False,'originalKeyUsed':False}
spec=load(OUT/'inputs/package/private/q22/figure-1.spec.json');points=spec['points']
def sub(a,b):return [points[a][i]-points[b][i] for i in [0,1]]
def norm(v):return math.hypot(*v)
def dist(a,b):return norm(sub(a,b))
def angle(v,a,b):
 x,y=sub(a,v),sub(b,v);return math.degrees(math.acos(max(-1,min(1,sum(p*q for p,q in zip(x,y))/(norm(x)*norm(y))))))
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
checks=[]
def ck(name,value,expected,tol=1e-9):
 assert abs(value-expected)<=tol,(name,value,expected)
 checks.append({'condition':name,'computedFromRawSpec':value,'expected':expected,'tolerance':tol,'passed':True})
ck('Q on circle',dist('O','Q'),180);ck('U endpoint on circle',dist('O','U'),180);ck('V endpoint on circle',dist('O','V'),180)
ck('quadrantUOV right',angle('O','U','V'),90);ck('right atS',angle('S','O','Q'),90);ck('right atU',angle('U','S','T'),90)
ck('O,Q,T collinear',cross(sub('Q','O'),sub('T','O')),0,1e-8)
ratio=dist('O','T')/dist('O','Q');assert ratio>1;assert points['O'][0]<points['S'][0]<points['U'][0]
alpha=angle('O','U','Q');beta=angle('T','U','Q');samebeta=angle('Q','O','S')
assert 0<alpha<45 and 45<beta<90;ck('beta same atQ/T',samebeta,beta);ck('complement within actual right triangles',alpha+beta,90)
ck('cos of actual illustrative beta = SQ/OQ',math.cos(math.radians(beta)),dist('S','Q')/dist('O','Q'))
proof['rawSpecGeometryChecks']={'specSha256':sha(OUT/'inputs/package/private/q22/figure-1.spec.json'),'checks':checks,
 'illustrativeAlphaDegrees':alpha,'illustrativeBetaDegrees':beta,'OQToOTScale':ratio,'OQToOUToPhysicalRadiusScale':90,
 'interpretation':'Spec is one legal illustrative configuration; alpha40 is not an extra numeric given or an oracle for full-domain proof.',
 'circleProportionalityTheoremRequired':False,'noNewRawSpecOrStudentAssetCreatedForMath':True}
path=OUT/'answer-equivalence-and-math.json';assert not path.exists();path.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'roleUnitExactAnswerEquivalent':True,'allFiveWholeDomainChecked':True,'specChecks':len(checks),'illustrativeAlpha':alpha,'illustrativeBeta':beta,'originalRawUnedited':True}))
