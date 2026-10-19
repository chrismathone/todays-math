import urllib.request,io,olefile,zlib,struct,hashlib,json,pathlib,re,zipfile
import fitz
out=pathlib.Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def get(url):
    return urllib.request.urlopen(url,timeout=50).read()
def paragraphs(data):
    ole=olefile.OleFileIO(io.BytesIO(data)); header=ole.openstream('FileHeader').read()
    data=ole.openstream('BodyText/Section0').read()
    if struct.unpack_from('<I',header,36)[0]&1:data=zlib.decompress(data,-15)
    pos=0;n=0;rows={}
    while pos<len(data):
        head=struct.unpack_from('<I',data,pos)[0];pos+=4;tag=head&1023;size=head>>20
        if size==4095:size=struct.unpack_from('<I',data,pos)[0];pos+=4
        payload=data[pos:pos+size];pos+=size;n+=1
        if tag==67:rows[n]=payload.decode('utf-16le')
    return rows
configs=[
 ('2015','https://www.moe.go.kr/boardCnts/fileDown.do?m=0404&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84','1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb',{
 2731:('4수02-10','여러 사각형의 종류와 성질: square의 같은 변 및 축평행 표현의 초등 선수'),
 3433:('6수03-06','삼각형 등 평면도형 넓이의 추론과 문제 해결: 밑변×높이÷2 및 분할'),
 3480:('삼각형 넓이 지도 유의','삼각형 바깥에 높이가 놓이는 경우 포함: OBC의 외부 높이 사용 가능'),
 3545:('6수04-02','두 양의 크기를 비교하는 비: 두 삼각형의 넓이비'),
 3558:('6수04-04','비례식 성질 및 간단한 비례식의 풀이: 동일 밑변을 갖는 넓이비에서 수치 높이 복원')}),
 ('2022','https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=1512facbda6c234a1641ac7e9c156ca2','aab8eed59ecf244223d04afad75f4cf5ac5085fadcfc3cf52c2f6d54ddfc7856',{
 3604:('9수02-01','상황을 문자식으로 표현하고 식의 값 계산'),3608:('9수02-02','일차식 덧셈과 뺄셈'),3619:('9수02-03','방정식과 해의 의미 및 등식 성질'),3623:('9수02-04','일차방정식 풀이와 활용'),3634:('9수02-05','순서쌍과 좌표'),3638:('9수02-06','그래프로 표현하고 해석'),3642:('9수02-07','정비례/반비례와 표·식·그래프 표현'),3691:('9수02-13','두 미지수의 연립일차방정식은 별개의 후속 기준이며 이번 M1 학생 풀이에 필요하지 않음'),3783:('9수02-07 해설','정비례/반비례의 직관적 실생활 관계를 통한 이해'),3855:('방정식 지도 유의','해를 구한 뒤 문제 상황 적합성을 확인하는 논리적 검토'),3887:('활용 문제 범위 유의','방정식·부등식·함수의 지나친 복잡화 금지; 유한 실제 출력의 수치 부담 별도 평가')})]
result={'method':'Official HTTP downloads in memory only, existing olefile and raw-deflate HWP parsing. Exact locators, hashes and reviewer paraphrases retained; no full publications written/copied.','documents':[]}
for edition,url,expected,targets in configs:
    data=get(url);container_sha=sha(data);member=None
    if data.startswith(b'PK'):
        archive=zipfile.ZipFile(io.BytesIO(data))
        matches=[n for n in archive.namelist() if '8]' in n and n.endswith('.hwp')]
        assert len(matches)==1
        member=matches[0];data=archive.read(member)
    assert sha(data)==expected, (edition,sha(data))
    rows=paragraphs(data);loc=[]
    for rec,(code,note) in targets.items():
        txt=rows[rec]
        if re.match(r'^\d',code):assert code.split(' ')[0] in txt, (edition,rec,ascii(txt))
        normalized=re.sub(r'[\x00-\x1f]','',txt).strip()
        loc.append({'code':code,'stream':'BodyText/Section0','record1based':rec,'paragraphUtf16DecodedSha256':sha(txt.encode()),'normalizedTextSha256':sha(normalized.encode()),'reviewerParaphrase':note})
    result['documents'].append({'edition':edition,'url':url,'downloadContainerSha256':container_sha,'zipMemberRawName':member,'actualSha256':sha(data),'expectedHashMatched':True,'locators':loc})
kurl='https://www.goe.go.kr/resource/goe/na/bbs_2675/2026/05/34866f8c-3e6b-45c1-84fb-4b232c919650.pdf'
k=get(kurl);assert sha(k)=='e3134915686021e9badf0ff5f8536b0ae2206de2a392907076eb83c9b6d5e08e'
pdf=fitz.open(stream=k,filetype='pdf');pages=[]
for page in [24,61]:
    txt=pdf[page-1].get_text()
    pages.append({'physicalPage1based':page,'pageTextSha256':sha(txt.encode()),'observedCodes':sorted(set(re.findall(r'9\s*수\s*02\s*-\s*0[1-6]',txt))),'containsGrade1Semester1Example':('[1학년 1학기 수학과 예시]' in txt),'containsKICE':('한국교육과정평가원' in txt),'containsPublicationNumber':('2026-32' in txt)})
assert pages[0]['containsGrade1Semester1Example'] and len(pages[0]['observedCodes'])==6
assert pages[1]['containsKICE'] and pages[1]['containsPublicationNumber']
result['actualM1Placement']={'url':kurl,'pdfSha256':sha(k),'pages':pages,'reviewerObservation':'공식2026 중1 1학기 평가계획 예시의9수02-01~06은 문자식/일차방정식/좌표·그래프를 포함한다. 중1 사례로 실제 수업·평가 배치를 확인하는 근거이며 법적 전국 학기 배당은 아니다. 정비례/반비례9수02-07는 해당 단원 학습 후라는 조건으로 판단한다.','limit':'예시 자료로2025 모든 학교/2026 모든 학기 준비도를 인증하지 않는다.'}
notice='https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401'
b=get(notice);html=b.decode('utf-8')
# Verify actual implementation dates occur in the primary notice, without copying the full notice.
for year in ['2025','2026','2027']:assert year in html
result['cohort']={'noticeUrl':notice,'noticeHtmlSha256':sha(b),'locator':'교육부 고시 제2022-33호 부칙1 나/다/라','rollout':{'M1_2022':'2025-03-01','E5E6_2022':'2026-03-01'},'exam2025M1':'초5/초6 이수는2023/2024:2015개정. 중1은2025부터2022개정.','exam2026M1':'초5/초6 이수는2024/2025:2015개정. 중1은2022개정.','limit':'현재2026의 초5/6가2022를 쓴다는 사실을2026중1이 과거 이수한 초등 선수교육과정에 소급하지 않는다. 유급·조기진급·개별 이력과 학교 진도는 별도 확인.'}
result['fullThirdPartyPublished']=False
(out/'primary-locators.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'documents':len(result['documents']),'locators':sum(len(x['locators']) for x in result['documents']),'M1Pages':pages,'fullThirdPartyPublished':False},ensure_ascii=True,indent=2))
