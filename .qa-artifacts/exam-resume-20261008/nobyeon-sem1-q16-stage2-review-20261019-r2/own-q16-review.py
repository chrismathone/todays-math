import pathlib,json,hashlib,urllib.request,io,zlib,struct,xml.etree.ElementTree as ET
p=pathlib.Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q16-stage2-review-20261019-r2')
def read(n): return json.loads((p/n).read_text(encoding='utf-8-sig'))
def sha(b): return hashlib.sha256(b).hexdigest()
def put(n,v):
 q=p/n;q.parent.mkdir(exist_ok=True)
 with q.open('x',encoding='utf-8',newline='\n') as f: json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
names=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q16-only.json','official-locators-reference.json','candidate-figure.spec.json','candidate-figure.svg']
hashes={n:sha((p/n).read_bytes()) for n in names}
a=read(names[0])[0];rawp=p.parent/'nobyeon-sem1-q16-clean-blind-20261019-r2/solve/q16.json';rawbytes=rawp.read_bytes();raw=json.loads(rawbytes)
assert sha(rawbytes)==read('sealed-raw-commit.json')['proofs'][0]['sha256']
assert hashes[names[0]]==read(names[1])['verificationInputsSha256']
assert sha(json.dumps(raw,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())==a['solveDigest']
assert raw==a['independentSolve']
def prime(n): return n>=2 and all(n%d for d in range(2,int(n**.5)+1))
pairs=[{'x':x,'y':y,'sideB':y+6,'difference':x*x-(y+6)**2,'prime':prime(x*x-(y+6)**2),'xy':x*y} for x in range(1,24) for y in range(1,24) if x+y==17 and x>y+6]
valid=[r for r in pairs if r['prime']];assert [(r['x'],r['y']) for r in valid]==[(12,5)]
choices={str(c):[{'x':x,'y':17-x,'larger':x>23-x,'difference':x*x-(23-x)**2} for x in range(1,17) if x*(17-x)==c] for c in [40,48,54,60,66]}
calc={'method':'인쇄식만으로 완전제곱식, 양의 변, 둘레 합, 제곱의 차, 소수의 양의 인수, 합과 차를 사용','steps':['y²+12y+36=(y+6)²; y+6>0','4x+4(y+6)=92 -> x+y=17','A>B -> x-y-6 is positive integer','area difference=23(x-y-6); 23 is prime -> x-y-6=1','x+y=17,x-y=7 -> x=12,y=5','144-121=23,48+44=92,xy=60 -> ④'], 'allFeasiblePairs':pairs,'allChoices':choices,'zeroConventionExtra':{'x':17,'y':0,'difference':253,'prime':False},'uniqueness':'양의 인수는 반드시 1; 합과 차가 고정되어 유일. 전수 정수 대입으로도 확인','units':'변·둘레 cm, 넓이 cm²; 넓이 차의 수가 소수, xy는 자연수의 곱','candidateAnswerMatches':a['candidate']['answer']=='④'}
assert calc['candidateAnswerMatches']
put('own-q16-calculations.json',calc)
s=read('candidate-figure.spec.json');tree=ET.fromstring((p/'candidate-figure.svg').read_text(encoding='utf-8-sig'));ns={'s':'http://www.w3.org/2000/svg'}
lines=tree.findall('.//s:line',ns);expected=[s['points'][v[0]]+s['points'][v[1]] for v in s['segments'].values()];actual=[[float(l.get(k)) for k in ['x1','y1','x2','y2']] for l in lines];assert actual==expected
sides=[]
for pre in ['A','B']:
 ps=[s['points'][pre+str(i)] for i in range(4)];vs=[(ps[(i+1)%4][0]-ps[i][0],ps[(i+1)%4][1]-ps[i][1]) for i in range(4)];lens=[v[0]**2+v[1]**2 for v in vs];assert len(set(lens))==1;assert all(vs[i][0]*vs[(i+1)%4][0]+vs[i][1]*vs[(i+1)%4][1]==0 for i in range(4));sides.append(int(lens[0]**.5))
assert sides==[120,110];assert sides[0]/12==sides[1]/11==10
labels=[g.attrib for g in tree.findall('.//s:g',ns) if 'data-label' in g.attrib];assert [g['data-label'] for g in labels]==['A','B'];assert [(float(g['data-px']),float(g['data-py'])) for g in labels]==[(90,80),(265,85)]
assert hashes['candidate-figure.spec.json']=='09a1f9ea5599d03118de7bedac7832d4b112a1a9bfd484ecb41fdd2cafb965ee'
assert hashes['candidate-figure.svg']=='5340655f8a589234dd79e7b6d2bce30f5541808de0d7cd465399a5e4c0544158'
put('own-q16-figure-evidence.json',{'hashes':{n:hashes[n] for n in names[-2:]},'edges':actual,'equalSidesAndRightAngles':True,'labels':['A','B'],'squareSidesGraphicUnits':sides,'independentlySolvedSidesCm':[12,11],'postSolveCommonGraphicUnitsPerCm':10,'intendedWidthMm':70,'interpretation':'350単位幅を70mmで示す模式図。実物大ではない。座標は解答導出に使用せず、代数解確定後の比率一致のみ検査。','limitations':'SVG/spec構造とラベル位置を検査。印刷実機・ブラウザ描画の実測は未実施。native/rightsは承認しない。'})
url='https://www.moe.go.kr/boardCnts/fileDown.do?m=&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84'
b=urllib.request.urlopen(url).read();import olefile
o=olefile.OleFileIO(io.BytesIO(b));data=o.openstream('BodyText/Section0').read();flag=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0]
if flag&1:data=zlib.decompress(data,-15)
i=0;rec=0;selected=[]
while i<len(data):
 h=struct.unpack_from('<I',data,i)[0];i+=4;size=h>>20
 if size==4095:size=struct.unpack_from('<I',data,i)[0];i+=4
 payload=data[i:i+size];i+=size;rec+=1
 if h&1023==67:
  t=payload.decode('utf-16le',errors='replace')
  if any(c in t for c in ['[9수01-01]','[6수03-03]','[6수03-04]','[6수03-05]','[9수01-07]','[9수02-05]','[9수02-12]']):selected.append({'record':rec,'text':t})
put('own-q16-official-evidence.json',{'moe2015':{'url':url,'sha256':sha(b),'actualRecords':selected,'interpretation':'공식 중학교군 표준 자체는 학년 배치를 증명하지 않음. 소수·소인수분해 및 식의 인수분해 근거와 초등 넓이·둘레/중학교 방정식 범위를 구분.'},'actualPlacementRead':{'url':'https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf','zeroBasedPage':89,'observation':'중학교3학년 대상, 다항식의 곱셈과 인수분해, 9수02-12, 완전제곱식 및 곱셈공식과 인수분해의 관계','scope':'이 문항의 완전제곱식·제곱의 차는 해당 절차의 적용. 소수 선수학습의 중1 배치 승인을 대신하지 않음'},'m1EquationPlacement':{'url':'https://edubook.ice.go.kr/src/viewer/download.php?host=main&no=1&site=20210607_145706_15','zeroBasedPage':53,'observation':'중학교1학년 일차방정식 9수02-05'},'m1PrimePlacement':{'status':'pending','reason':'공식 2015 중학교군 소인수분해 표준은 확인. 정확한 중1 배치를 명시한 일차자료는 이번 제한 검토에서 확보하지 못함. 검색결과의 후대 자료/관련 최대공약수 항목으로 대체 승인하지 않음. KOSAC 자료는 웹 도구의 62MB 크기 제한으로 열지 못했고 대규모 추가 다운로드하지 않음.'},'era':{'url':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0','observation':'2022 개정의 중1 2025, 중2 2026, 중3 2027 순차 적용; 2025/2026 중3은 2015 대상','2027M3':'pending-separate-placement'},'copyright':'전체 외부 문서 저장 없음; 관련 표준 소량 및 검토 관찰만 기록'})
checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','scoreAppropriate']};checks.update(curriculumAppropriate=False,allStudentSurfacesInScope=False,unitFamilyFit=False)
evidence={'calculations':'own-q16-calculations.json','figure':'own-q16-figure-evidence.json','primary':'own-q16-official-evidence.json','rawSha256':sha(rawbytes),'parentSealCommit':read('sealed-raw-commit.json')['rawCommit'],'digestBinding':'원본 입력 SHA 및 raw canonical solveDigest 검증. candidateDigest/assetDigest는 해시 검증한 envelope의 정확한 값이며 미공개 projection 재계산을 주장하지 않음.','coreComparison':'원문 x²-y²-16y-64=x²-(y+8)²의 완전제곱식·제곱의 차·소수 인수 구조를 재사용. 원문 자연수 곱의 최솟값에서 새 문항의 넓이·둘레 조건으로 유일한 두 변을 역산하는 목표로 변경. 단순 수치 치환은 아니며 기하량을 식으로 옮기는 절차가 추가됨.','wording':'A/B, cm/cm²와 넓이 차의 수라는 표현은 자연스럽고 수 자체의 소수 조건을 명확히 함. 둘레의 합으로 두 변의 합을 얻는 방식은 중학생에게 읽을 수 있음.','solutionAudit':'양의 제곱근, 양의 정수 인수, 소수 23, 합·차 풀이, 원조건 재대입 모두 타당. 모든 선택지 및 유일성은 별도 계산 파일에서 확인.','scoreEditorial':'5점 응용 제안은 넓이식 복원→둘레 식→차의 인수분해→소수 조건→합차→재확인으로 여러 연결이 필요하여 편집상 타당. 원문 중과 난도 동등성/실측 정답률 승인 아님.','familyHold':'인수분해 Unit 068bcc39-0927-4f43-a919-24b61ca425f9는 주개념 관찰. 정확한 혼합 기하·소수 역산 family 정의 미확인, familyKey null. prime prerequisite UUID도 미확인. 키/학교/개수로 의미 인증하지 않음.','gradeHold':'2015 중3 인수분해 배치와 초등/방정식 표준은 근거 있음. 중1 소수 실제 배치의 정확한 일차자료 연결이 남아 전체 선수학습 및 grade 승인 보류. 실제 배운 뒤만 배정 가능.','mathApproved':True,'gradeApproved2015M3':False,'gradeStatus':'pending-prime-prerequisite-placement','difficultyEqualityApproved':False,'liveFamilyApproved':False,'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'loadable':False,'2022M3':'pending'}
surfaces={k:{'status':'passed','reason':'인쇄식의 자연수·넓이·둘레·완전제곱식·제곱의 차 및 합차 풀이 범위. 세부 계산/도형/공식 근거 파일 참조.'} for k in ['stem','choices','figuresAndTables','notation','answer','studentSolution']};surfaces['prerequisites']={'status':'pending','reason':'소수 선수학습의 실제 중1 배치 및 prerequisite UUID 미확인; 2015 중학교군 표준만으로 학년 승인하지 않음.'}
put('reports/q16.json',dict(status='pending',studentDigest=a['studentDigest'],candidateDigest=a['candidateDigest'],assetDigest=a['assetDigest'],method='independent-solve-then-review',verifierId='codex-independent-q16-stage2-r2-20261019',solveDigest=a['solveDigest'],checks=checks,evidence=evidence,curriculumSurfaces=surfaces))
assert all(sha((p/n).read_bytes())==h for n,h in hashes.items());assert rawp.read_bytes()==rawbytes
put('own-q16-input-hashes.json',{'inputs':hashes,'rawSha256':sha(rawbytes),'inputsAndRawUnchanged':True,'outputs':{str(q.relative_to(p)):sha(q.read_bytes()) for q in p.rglob('*') if q.is_file() and (q.name.startswith('own-') or q.parent.name=='reports')},'counts':{'mathApproved':1,'gradeApproved':0,'held':1,'checksTrue':sum(checks.values()),'checksFalse':3,'surfacesPassed':6,'surfacesPending':1}})
print(json.dumps({'reportSha256':sha((p/'reports/q16.json').read_bytes()),'counts':sum(checks.values()),'primaryRecords':len(selected)}))
