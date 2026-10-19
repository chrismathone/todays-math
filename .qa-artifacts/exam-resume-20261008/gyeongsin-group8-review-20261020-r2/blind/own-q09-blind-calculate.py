import json,hashlib
from pathlib import Path
from fractions import Fraction as F
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group8-review-20261020-r2/blind')
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
with(p/'own-q09-blind-utf8-probe.txt').open('x',encoding='utf-8')as f:f.write('경신 q09 독립 풀이: 접선의 수직·AA닮음 UTF-8 확인\n')
assert(p/'own-q09-blind-utf8-probe.txt').read_text(encoding='utf-8')=='경신 q09 독립 풀이: 접선의 수직·AA닮음 UTF-8 확인\n'
a=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0];m=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert sha(p/'student-problems.json')==m['studentProblemsSha256'];assert sha(p/'figures/q09-1.svg')==m['figures'][0]['sha256']==a['figures'][0]['sha256']
digest=hashlib.sha256(json.dumps({k:v for k,v in a.items()if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();assert digest==a['studentDigest']
r=F(3);RP=F(5);RF=OG=r;RG=OF=r;PF=RP-RF;ratio=PF/RP;RQ=OF/ratio;GQ=RQ-RG
assert PF==2 and ratio==F(2,5) and RQ==F(15,2) and GQ==F(9,2)
assert all(z>0 for z in [r,RP,RF,RG,PF,OF,OG,RQ,GQ])
choices=[F(7),F(15,2),F(8),F(17,2),F(9)]
checks=[{'mark':'①②③④⑤'[i],'RQ_cm':str(q),'PF_times_RQ_cm2':str(PF*q),'OF_times_PR_cm2':str(OF*RP),'matches_AA':PF*q==OF*RP}for i,q in enumerate(choices)]
assert[z['mark']for z in checks if z['matches_AA']]==['②']
assert RP*RP+RQ*RQ==F(325,4) and PF*PF+OF*OF==13
assert F(13)/F(325,4)==ratio*ratio
solution='접점에 그은 반지름은 접선에 수직이므로 OF⊥RP, OG⊥RQ이다. ∠PRQ=90°이므로 사각형 RFOG는 직사각형이고, OF=OG=3 cm이므로 한 변의 길이가 3 cm인 정사각형이다. 따라서 RF=RG=3 cm이고 PF=RP−RF=5−3=2 cm이다. O는 빗변 PQ 위에 있고 F는 변 RP 위에 있으므로 ∠FPO=∠RPQ이다. 또 ∠PFO=∠PRQ=90°이므로 △PFO와 △PRQ는 두 각의 크기가 각각 같아 닮음이다. 대응은 P↔P, F↔R, O↔Q이다. 그러므로 PF/PR=FO/RQ, 즉 2/5=3/RQ이므로 RQ=15/2 cm이다. 보기 중 ②이다. 각 보기 7,15/2,8,17/2,9 cm에 대해 2RQ는14,15,16,17,18 cm가 되어 2RQ=15 cm를 만족하는 값은②뿐이다. RF=3<RP=5이고 RG=3<RQ=15/2라 두 접점은 각 변의 내부에 있다. 닮음비 PO/PQ=2/5는0과1사이이므로 중심O도 빗변 내부에 있다. 모든 길이는 양수이며 닮음의 일차비례식은 요구 길이를 하나만 정한다.'
existence='서로 수직인 변 RP=5 cm,RQ=15/2 cm인 삼각형을 만들고 R에서 각각3 cm인 F,G를 잡는다. RFOG를 정사각형이 되게 O를 잡으면 OF=OG=3이고 두 변에수직이다. PF=2이므로 직각삼각형PFO와PRQ의두직각변은 PF/PR=2/5=FO/RQ로대응하며 끼인각도90°라 닮음이다. 따라서 P에서의각이같아 P,O,Q가한직선위에있고 PO/PQ=2/5이므로 O는PQ내부다. 중심O반지름3의원은두변에F,G에서접하며조건을모두만족한다. 반대로모든허용배치에서는PF2,FO3과AA닮음으로RQ15/2가강제된다. 도형의회전/반사까지하나라는주장이아니라요구길이의유일성이다. 원전체가삼각형내부라는조건은없고 중심이빗변위라원은빗변양쪽으로나올수있다.'
exposure={'currentGyeongsinQ09R2AuthorAnswerSolutionMetadataExposedBeforeRaw':False,'priorOriginalGyeongsinQ09ExposureKnown':False,'declaration':'보존된허가이력에서원본GYEONGSINq09를읽은이력은없다. 이전허가된원본H페이지에서보인원래문항은q05~q08이며이번현재authoredq09R2답·해설·메타데이터는읽지않았다. 다른시험Nobyeonq09와관련원/접선문항및기존코드검토이력은있으므로수학주제전체미노출은주장하지않는다. 현재학생패킷만으로풀이했고rootgroup8저자/원본/비공개패키지/R1은열지않았다.'}
evidence={'exposureDeclaration':exposure,'exactCalculations':{'radius_cm':str(r),'RF_RG_OF_OG_cm':str(r),'RP_cm':str(RP),'PF_cm':str(PF),'small_to_big_ratio':str(ratio),'RQ_cm':str(RQ),'GQ_cm':str(GQ),'PO_over_PQ':str(ratio),'PQ_squared_cm2':str(RP*RP+RQ*RQ),'PO_squared_cm2':'13'},'AAjustification':{'small':'PFO','large':'PRQ','mapping':{'P':'P','F':'R','O':'Q'},'rightAngles':'radius OF perpendicular to tangent RP gives anglePFO90; anglePRQ90 isgiven.','otherAngle':'F lies on PR and O on PQ so angleFPO equals angleRPQ.','sideCorrespondence':'PF↔PR,FO↔RQ,PO↔PQ; 2/5=3/(15/2).'},'allChoices':checks,'existenceUniqueness':existence,'domainSignUnits':'r3,PF2,RP5,RQ15/2,GQ9/2都是正の長さ。分母5とPF2、比例式で使うRQ15/2は0ではない。長さcm、積と平方cm²、角度degree90、比は無次元。','studentMethod':'원의반지름과접선의수직,직사각형/정사각형,두각이같은삼각형의닮음과단순분수비례식이다.2015M3원의접선과이전닮음을학습한학생의방법이며사인법칙/원의방정식/좌표/원의비례일반공식/외접반지름을쓰지않는다.','figureInspection':'학생SVG를PyMuPDF로자체PNG변환하여 R의직각,F/G의접점수직,O가PQ위에있는관계를육안확인했다. 픽셀길이·각이나SVG좌표를수치oracle로쓰지않았다.','bindings':{'studentDigest':digest,'studentProblemsSha256':sha(p/'student-problems.json'),'svgSha256':sha(p/'figures/q09-1.svg')},'limits':'학생raw풀이만봉인하며별도저자/학년7면/출처/권리/family/native/배포승인또는새승인개수증가가아니다.'}
evidence['domainSignUnits']='r=3,PF=2,RP=5,RQ=15/2,GQ=9/2는모두양의길이다. 분모5와PF2및비례식에쓰는RQ15/2는0이아니다. 길이cm,곱과제곱cm²,각90°,길이비는무차원이다. 음의길이는허용하지않는다.'
raw={'studentDigest':digest,'solverId':'independent-retained-helper-gyeongsin-q09-r2','answer':'②','solution':solution,'evidence':evidence,'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
for file,obj in [(p/'own-q09-blind-calculations.json',evidence),(p/'own-q09-blind-exposure.json',exposure),(p/'solve/q09.json',raw)]:
 with file.open('x',encoding='utf-8')as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'rawSha256':sha(p/'solve/q09.json'),'RQ_cm':str(RQ),'studentDigest':digest,'status':'solved'}))
