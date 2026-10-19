import json,hashlib,re
from pathlib import Path
from fractions import Fraction
p=Path('.qa-artifacts/exam-resume-20261008/inverse-tangent-rectangle-prototype-20261020-r1')
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
def canonical_sha(x):return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def show(x):return str(x.numerator) if x.denominator==1 else f'{x.numerator}/{x.denominator}'
with (p/'own-utf8-probe.txt').open('x',encoding='utf-8')as f:f.write('U52 독립 학생 계산: 접선·직사각형·양의 길이 UTF-8\n')
assert (p/'own-utf8-probe.txt').read_text(encoding='utf-8')=='U52 독립 학생 계산: 접선·직사각형·양의 길이 UTF-8\n'
packet= json.loads((p/'student-only10.json').read_text(encoding='utf-8-sig'));assert packet['authorAnswersIncluded'] is False and len(packet['students'])==10
inputsha=sha(p/'student-only10.json');before={str(p/'student-only10.json'):inputsha};rows=[]
exposure={'relatedManualQ08RawAndAuthorReviewExposed':True,'oldFamily16CodeAnd12ActualSamplesExposed':True,'priorOriginalQ08PageExposed':True,'newU52FactoryCodePrivateDraftAnswersFullSolutionsExposedBeforeSeal':False,'declaration':'関連' }
exposure['declaration']='관련 GYEONGSIN q08 raw/저자 검토와 기존 family16 코드·실제12표본에 이미 노출되었다. 원본 H q08도 이전 허가된 페이지에서 보았다. 현재 U52 inverseTangentRectangle.ts, private-drafts10.json, 새 factory 답/해설은 읽지 않았다. 완전한 관련자료 비노출 주장이 아닌, 학생전용10페이로드에 대한 독립 정확계산이다.'
for s in packet['students']:
 assert s['format']=='단답형' and s['course']=='중3' and s['curriculum']=='2015'
 assert re.fullmatch('[a-f0-9]{64}',s['studentDigest'])
 figure=p/s['figure']['path'];assert figure.parent==p and sha(figure)==s['figure']['sha256'];before[str(figure)]=sha(figure)
 printed=dict((key,Fraction(value))for key,value in re.findall(r'\\overline\{(BC|AE)\}=(\d+)',s['content']))
 assert set(printed)=={'BC','AE'}
 w,a=printed['BC'],printed['AE'];r=w/2;k=a-r
 assert w>0 and r>0 and r<a<w # each of these ten givens, not a claim of the factory domain
 coefficient=4*k;x=w*w/coefficient;EF=k;CF=x;EC=k+x;EB=x-k;height=r+x
 assert all(z>0 for z in [r,k,coefficient,x,EF,CF,EC,EB,height])
 assert height-a==EB and EC==EF+CF and EC*EC==w*w+EB*EB and coefficient*x==w*w
 # Construction in rectangle width w/height h, circle at distance r from top and sides.
 EO2=r*r+k*k;CO2=r*r+x*x
 assert EO2+CO2==EC*EC # converse Pythagoras: angle EOC right
 altitude2=EO2*CO2/(EC*EC);assert altitude2==r*r
 assert EO2/EC==EF and CO2/EC==CF # AA in right EOC with altitude at F
 assert height>2*r and r<a<height and 0<EF<EC and 0<CF<EC
 # A distinct positive candidate x+1 fails the exact printed-equation relation.
 assert coefficient*(x+1)!=w*w
 q={name:show(value)for name,value in {'width':w,'AE':a,'radius':r,'EI_EF':k,'CF_CG':x,'height_AB_CD':height,'EB':EB,'EC':EC,'linearCoefficient':coefficient,'EO_squared':EO2,'CO_squared':CO2,'distance_O_to_EC_squared':altitude2}.items()}
 solution=(f'왼쪽 변 AB와 오른쪽 변 CD의 원과의 접점을 각각 I,G라 하자. BC={show(w)} cm는 원의 지름이므로 반지름은 {show(r)} cm이다. 위쪽 변 DA에도 접하므로 AI=DG={show(r)} cm이고, EI=AE−AI={show(a)}−{show(r)}={show(k)} cm이다. 같은 점 E에서 그은 두 접선의 길이는 같아 EF=EI={show(k)} cm이다. CF=CG=x cm라 두면 CD=x+{show(r)} cm이고, EB=AB−AE=x+{show(r)}−{show(a)}=x−{show(k)} cm이다. 또 EC=x+{show(k)} cm이다. ∠EBC=90°이므로 (x+{show(k)})²=(x−{show(k)})²+{show(w)}²이다. 전개하여 같은 항을 지우면 {show(coefficient)}x={show(w*w)}이고, x={show(x)}이다. 따라서 EC={show(x)}+{show(k)}={show(EC)} cm이다. EB={show(EB)}>0, EF={show(EF)}>0, CF={show(CF)}>0이고 EF+CF=EC이므로 F는 선분 EC의 내부에 있다. 위 식은 계수가 양수인 일차식이므로 요구 길이는 유일하다.')
 existence=(f'가로{show(w)}, 세로{show(height)}인 직사각형의 위변과 양옆변으로부터 {show(r)}만큼 떨어진 중심에 반지름{show(r)}의 원을 그린다. 왼쪽 변 위에서 AE={show(a)}인 E를 잡을 수 있고 E는 위 접점I보다 아래다. EO²={show(EO2)},CO²={show(CO2)},EC²={show(EC*EC)}이므로 EO²+CO²=EC²이다. 따라서 EOC가 직각삼각형이고, 넓이를 두 방식으로 구한 O에서 빗변EC까지 거리의 제곱은 EO²·CO²/EC²={show(altitude2)}=r²이다. 거리는 양수이므로 r이며 EC는 원에 접한다. 그 수선의 발 F는 빗변 내부이고 AA닮음의 길이 관계 EF=EO²/EC={show(EF)}, CF=CO²/EC={show(CF)}도 일치한다. 이는 구성 검산에서 직각삼각형 넓이/AA를 사용하는 것이며 원의 접선곱/할선곱 정리를 전제로 하지 않는다.')
 rows.append({'caseId':s['caseId'],'studentDigest':s['studentDigest'],'studentRecordSha256':canonical_sha({key:value for key,value in s.items()if key!='studentDigest'}),'figureSha256':sha(figure),'solverId':'independent-retained-helper-U52-student-only10','answer':show(EC)+' cm','solution':solution,'status':'solved','evidence':{'printedGivens':{key:show(value)for key,value in printed.items()},'exactRationalCalculations':q,'equation':f'(x+{show(k)})²=(x−{show(k)})²+{show(w)}² ->{show(coefficient)}x={show(w*w)}','domainAndUniqueness':'반지름과 모든 부분길이는 양수. x>k에서 EB>0. 4k>0이므로 방정식은 x 하나만 결정하며 EC=x+k도 하나다. 제곱근/음수 가지 추가 없음. 분모2,4k,EC는0이 아니다. 길이cm,제곱cm².','existence':existence,'tangentMethodJustification':'접점반지름은 접선과 직각이다. EO 공통빗변과 OI=OF인 직각삼각형 EIO/EFO의 합동에서 EI=EF, CO공통빗변과 OG=OF인 CGO/CFO의 합동에서 CG=CF이다. 일반 원과비례·접선곱·외접반지름·사인법칙·좌표를 요구하지 않는다.','gradeStudentMethod':{'status':'bounded-student-method-in-2015-M3-after-prerequisites','basis':'2015 원의현/접선9수04-19, 이미배운 피타고라스9수04-16,직사각형/합동,식전개와일차방정식으로 전체풀이가 닫힌다. 전에 실제로 본 KOSAC2015 기하기준과공식M3계획physical74/printed72의접선배치에 비추어 판단했다. 새factory전체해설·코드·출력면은미노출로아직승인하지않는다. 2022M3별도pending.'},'figureView':'All ten supplied student SVGs rendered through PyMuPDF and visually checked as a contact sheet for circle-three-side contacts, A-B-C-D/E/F labels, OF perpendicular to EC and internal F. No pixel or SVG-coordinate numeric oracle.','choices':'Not applicable: all ten are short-answer, not MC. No invented choices.','exposureDeclaration':exposure}})
assert len({s['caseId']for s in rows})==10 and len({s['studentDigest']for s in rows})==10
report={'kind':'independent-U52-student-only-raw-solves10/v1','status':'solved-from-student-givens-only','inputSha256':inputsha,'solverId':'independent-retained-helper-U52-student-only10','exposureDeclaration':exposure,'solves':rows,'digestBindingLimit':'studentDigest strings are preserved exactly as supplied labels and bound through this exact student packet SHA; their internal factory projection is not yet exposed or claimed reproduced. Own canonical studentRecordSha256 and all ten actual SVG hashes are independently calculated. Future source review must verify exact printed payload binding.','counts':{'solvedPrintedCases':10,'distinctStudentStatements':10,'distinctScalarAnswers':len({s['answer']for s in rows}),'newApprovedManualQuestions':0,'newBlindCorpusClaims':0,'gradeReleaseApprovals':0,'newFiguresApproved':0},'holds':{'actualFactoryCodeUnseen':True,'actualFactoryFullSolutionsUnseen':True,'actualFactoryGradeCertificate':False,'sourceRightsNativeLoadableApproved':False,'curriculum2022':'pending'},'inputHashesBefore':before,'inputHashesAfter':{f:sha(Path(f))for f in before}}
for f,h in before.items():assert sha(Path(f))==h
for file,obj in [(p/'own-raw-solves10.json',report),(p/'own-calculations10.json',{'inputSha256':inputsha,'rows':[{'caseId':s['caseId'],'studentDigest':s['studentDigest'],'figureSha256':s['figureSha256'],'answer':s['answer'],'calculations':s['evidence']['exactRationalCalculations'],'existence':s['evidence']['existence']}for s in rows],'exposureDeclaration':exposure,'limits':report['holds']})]:
 with file.open('x',encoding='utf-8')as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'answers':[s['answer']for s in rows],'rawSha256':sha(p/'own-raw-solves10.json'),'inputSha256':inputsha,'solved':10,'newApprovedManualQuestions':0}))
