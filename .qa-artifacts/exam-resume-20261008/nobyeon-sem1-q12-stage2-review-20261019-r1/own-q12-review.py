from pathlib import Path
from fractions import Fraction as F
import json,hashlib,urllib.request,io,struct,zlib
import olefile
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q12-stage2-review-20261019-r1')
def sha(data):return hashlib.sha256(data).hexdigest()
def load(n):return json.loads((b/n).read_text(encoding='utf-8'))
def digest(o):return sha(json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
allowed=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q12-only.json','official-locators-reference.json']
hashes={n:sha((b/n).read_bytes()) for n in allowed}
v=load('verification-inputs.json')[0];manifest=load('verification-manifest.json');sealed=load('sealed-raw-commit.json');ref=load('official-locators-reference.json')
assert hashes['verification-inputs.json']==manifest['verificationInputsSha256']
rawpath=b.parent/'nobyeon-sem1-q12-clean-blind-20261019-r1/solve/q12.json';rawbytes=rawpath.read_bytes();raw=json.loads(rawbytes)
assert sha(rawbytes)==sealed['proofs'][0]['sha256']==manifest['originalSolveFileHashes'][0]['sha256']
assert raw==v['independentSolve'] and digest(raw)==v['solveDigest'] and raw['studentDigest']==v['studentDigest']
assert raw['answer']==v['candidate']['answer']=='⑤' and digest(v['assets'])==v['assetDigest']
# Exact arithmetic independently recomputed from the current printed definitions.
def add(a,b):return (a[0]+b[0],a[1]+b[1])
def mul(a,b):return (a[0]*b[0]+5*a[1]*b[1],a[0]*b[1]+a[1]*b[0])
def sub(a,b):return (a[0]-b[0],a[1]-b[1])
def inv(a):
 n=a[0]*a[0]-5*a[1]*a[1];assert n!=0
 return (a[0]/n,-a[1]/n)
def scale(a,t):return (a[0]*t,a[1]*t)
def encode(a):return dict(rational=str(a[0]),sqrt5Coefficient=str(a[1]))
u=inv((F(-1),F(1)));w=inv((F(1),F(1)));total=add(u,w);difference=sub(u,w);product=mul(u,w)
quartic=sub(mul(mul(mul(u,u),u),w),mul(u,mul(mul(w,w),w)))
assert quartic==mul(mul(product,difference),total)==(F(0),F(1,16))
rhs=(F(0),F(13,16));answer=mul(sub(rhs,quartic),inv(total));assert answer==(F(3,2),F(0))
choices=[]
for i,t in enumerate([F(-1,2),F(0),F(1,2),F(1),F(3,2)]):
 lhs=add(quartic,scale(total,t));choices.append(dict(mark=chr(0x2460+i),t=str(t),lhs=encode(lhs),residual=encode(sub(lhs,rhs)),satisfies=lhs==rhs))
assert sum(c['satisfies'] for c in choices)==1
calc=dict(representation='r+s√5; exact Fraction arithmetic',u=encode(u),v=encode(w),uPlusV=encode(total),uMinusV=encode(difference),uv=encode(product),directQuartic=encode(quartic),factoredQuartic=encode(mul(mul(product,difference),total)),target=encode(rhs),t=encode(answer),choices=choices,denominatorAndDomain='√5>1なので元の二分母は正で非零。')
calc['denominatorAndDomain']='√5>1로 두 원래 분모는 양수·비영이다. 유리화의 공통분모4와 수치분모16은 비영, u+v=√5/2>0도 비영이다. t는 모든 실수 중에서 구하며 단위는 없다.'
# Read only relevant primary standard records into evidence; no full document retained.
data=urllib.request.urlopen(ref['downloadUrl'],timeout=40).read();assert sha(data)==ref['actualDownloadedSha256']
o=olefile.OleFileIO(io.BytesIO(data));h=o.openstream('FileHeader').read();body=o.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',h,36)[0]&1:body=zlib.decompress(body,-15)
p=0;rec=0;records=[]
while p<len(body):
 hd=struct.unpack_from('<I',body,p)[0];p+=4;tag=hd&1023;size=hd>>20
 if size==4095:size=struct.unpack_from('<I',body,p)[0];p+=4
 payload=body[p:p+size];p+=size;rec+=1
 if rec in [3788,3916,3956]:
  assert tag==67
  records.append(dict(record1based=rec,text=payload.decode('utf-16le')))
assert len(records)==3
placement_url='https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202202101132253081.pdf'
ph=hashlib.sha256();bytecount=0
with urllib.request.urlopen(placement_url,timeout=40) as response:
 while True:
  chunk=response.read(65536)
  if not chunk:break
  ph.update(chunk);bytecount+=len(chunk)
official=dict(standards=dict(url=ref['downloadUrl'],sha256=sha(data),stream='BodyText/Section0',records=records),radicalPlacement=dict(url=placement_url,sha256=ph.hexdigest(),bytes=bytecount,document='경기도교육청2022성장중심평가를 위한 논술형평가 길라잡이',locator='PDF0basedp38/printed38;과목수학 대상중학교3학년;4차시9수01-10;평가요소 분모의유리화',observation='중3 대상이라는 표 머리와 근호 계산/유리화를 같은 수업 설계 표에서 실제 확인.발간연도2022는2022개정교육과정 표기가 아니며2015기준 문구에 대응한다.'),polynomialPlacement=dict(url='https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf',locator='PDF0basedp89/printed90;중학교3학년;다항식의 곱셈과인수분해;9수02-12',observation='동일세션에서 실제 읽은 공식교육청 표의 학년·단원배치.기존 문항의 승인결과가 아닌 1차문헌 배치 관찰을 현재q12의 공통인수/제곱의차 단계에 새로 적용.'),era=dict(url=ref['era']['url'],locator='부칙1나/다/라',scope='2025/2026M3=2015;2027M3부터2022는별도보류'),fullExternalDocumentsSaved=False)
keys=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']
checks={k:k!='unitFamilyFit' for k in keys}
surface=dict(stem='두 실수 u,v를 비영 근호분모로 정의하고 실수t를 구하도록 명시한다. 고차모양u³v-uv³도 공통uv와 제곱의차로 다루는 중3곱셈·인수분해 구조이다.',choices='음의분수·0·양의분수·정수인 다섯보기를 모두 정확계산했다. LHS√5계수는-3/16,1/16,5/16,9/16,13/16로⑤만 맞고 모든보기는2015중3유리수 범위이다.',figuresAndTables='순수 대수 문항이고 assets=[]이며 별도표/도형/축척전제가 없다. 봉인raw의 인쇄이미지 확인과 현재content가 대응한다.',notation='u,v,t,분수·근호·지수3과 곱 표기는 중학교 식의계산 표기이다. 인수정리나 세제곱합차공식·복소수·고등 항등식미정계수법을 요구하지 않는다.',answer='t=3/2는실수이며⑤에대응한다. 부호조건은t에없다. t의계수√5/2가비영이므로해가유일하다.',studentSolution='현재해설의u=(√5+1)/4,v=(√5-1)/4→합√5/2·차1/2·곱1/4→uv(u²-v²)=uv(u-v)(u+v)=√5/16→양변16/√5곱→1+8t=13→t=3/2→대입및유일성/원분모비영을 단계마다새계산과대조했다. 모두정확하다.',prerequisites='중3근호계산과분모유리화,곱셈공식/공통인수묶기와제곱의차를학습한이후. 중1일차방정식·중2지수및다항식계산도선수이다. 주단원이곱셈이라는이유로 인수분해/역분배단계의학습을생략하지않는다. 학교별중간고사진도인증은아니다.')
evidence=dict(calculations=calc,answerCorrect='현재⑤는봉인raw와일치하며독립정확계산에서t=3/2가유일하다.',solutionCorrect=surface['studentSolution'],existenceUniqueness='원래분모가모두양수라u,v가존재하고,비영계수u+v=√5/2로t의일차방정식해가유일하다. t=3/2대입시좌변13√5/16로실제성립한다.',choicesCorrect=choices,figureConsistent=surface['figuresAndTables'],sameCoreConceptAndProcedure='허용원문은두근호분수를유리화하고합·차·곱과공통인수/합차공식으로x³y-xy³-x-y의고정결과를구한다. 후보도두분모유리화→합·차·곱계산→고차항을uv(u-v)(u+v)로축소→결합식대입이라는핵심을유지한다.',distinctPresentation='고정계수-1의합항을포함한직접계산결과를묻던원문에서,결합값13√5/16을조건으로제공하고합항의실수계수t를역으로복원한다. 주어진정보/질문대상의방향이실제로바뀌며√3→√5와문자변경만을차이로주장하지않는다.',naturalKorean='정의한두수와등식,구할실수t의대상이명확하다. 빈줄의등식과“이성립할때”가문법적으로연결되고새상황문구나단위혼동이없다.',curriculumAppropriate='교육부실제9수01-10(근호사칙계산),9수02-12(곱셈/인수분해),9수02-05(일차방정식)원문을다시읽고현재풀이단계에적용했다. 경기도교육청의실제중3표에서유리화배치를,인천교육청의실제중3표에서곱셈/인수분해배치를확인했다. 기존q10/q11학년승인이나출신학교만으로판정하지않는다.',allStudentSurfacesInScope='일곱surface를현재후보에개별적용하여모두passed.2015중3의필수선수학습이후로한정한다.',unitFamilyFit='false/pending:본문은근호계산·인수분해·계수역산이섞인완결목표이다. metadata의혼합A19 key/count와family후보목록만으로실제정의/목표/domain호환을확정할수없다. 현재범위에서는엔진정의를읽지않았으므로정확한livefamily를선택하지않는다.',scoreAppropriate='4점은두유리화,합·차·곱,공통인수/제곱의차와계수역산이연결되는중간수준응용으로편집상타당하다. 작은분모4/16과한개의근호5로직접전개보다계산량을제한한다. 저자variant의원문“중”은제공source의difficultyLabelFromSource=하와다르므로원문사실로인정하지않는다. 직접계산보다역산한단계가늘었다는편집판단이며동일실측난도·정답률·학습효과는주장하지않는다.',curriculumSurfaceEvidence=surface,officialEvidence='own-q12-official-evidence.json',rawSha256=sha(rawbytes),localRawCommit='14e02717e9b535171f375a47c3ae82d315811e7d',parentRawCommit=sealed['rawCommit'],verificationInputsSha256=hashes['verification-inputs.json'],digestBinding='candidateDigest는SHA256검증된verification-inputs의정확한값을사용;solveDigest는봉인raw객체의정렬키canonicalJSONSHA256와일치검증.',pendingReasons=['정확한혼합livefamily의정의/목표/절차/domain배정미확정'],metadataConditions='metadata가근호계산선수Unit을기록하지만공통인수묶기/제곱의차를역방향으로쓰는학습조건도배치검토에명시해야한다.',scope='허용stage2여섯입력과자신의봉인raw및해당공식학년/기준표만사용.전체sourceManifest/저자별도계산파일/루트코드/다른QA는읽지않음.')
report=dict(status='pending',studentDigest=v['studentDigest'],candidateDigest=v['candidateDigest'],assetDigest=v['assetDigest'],method='independent-solve-then-review',verifierId='fresh-independent-codex-q12-stage2-20261019-r1',solveDigest=v['solveDigest'],checks=checks,evidence=evidence,curriculumSurfaces={s:'passed' for s in surface},mathApproved=True,gradeApproved2015M3=True,year2022M3='pending-separate-placement-review',liveFamily=False,unitFamilyFit=False,sourceIdentityApproved=False,rightsApproved=False,similarityApproved=False,nativeProvenanceApproved=False,loadable=False)
assert len(checks)==12 and sum(checks.values())==11 and len(surface)==7
(b/'reports').mkdir(exist_ok=True)
for path,obj in [(b/'reports/q12.json',report),(b/'own-q12-calculations.json',calc),(b/'own-q12-official-evidence.json',official),(b/'own-q12-input-hashes.json',hashes)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
assert sha(rawpath.read_bytes())==sha(rawbytes)
for n,h in hashes.items():assert sha((b/n).read_bytes())==h
print('ReportSHA256',sha((b/'reports/q12.json').read_bytes()))
print('12checks/11true;7surfacespassed;familyheld;5choicesexact;rawand6inputsunchanged.')
