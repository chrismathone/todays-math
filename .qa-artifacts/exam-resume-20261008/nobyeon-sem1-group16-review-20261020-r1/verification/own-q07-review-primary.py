from pathlib import Path
import urllib.request,hashlib,zlib,struct,json,olefile
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group16-review-20261020-r1/verification')
probe='q07 정식 검토 UTF-8: 중복 분류와 순환소수'
with (p/'own-q07-review-utf8-probe.txt').open('x',encoding='utf-8') as f:f.write(probe+'\n')
assert (p/'own-q07-review-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
url='https://www.moe.go.kr/boardCnts/fileDown.do?m=&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84'
b=urllib.request.urlopen(url,timeout=40).read();sha=hashlib.sha256(b).hexdigest();assert sha=='1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb'
local=p/'own-q07-review-primary-moe.local.hwp'
with local.open('xb') as f:f.write(b)
ole=olefile.OleFileIO(b);header=ole.openstream('FileHeader').read();body=ole.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',header,36)[0]&1:body=zlib.decompress(body,-15)
at=0;idx=0;hits=[]
while at<len(body):
 hdr=struct.unpack_from('<I',body,at)[0];at+=4;size=hdr>>20;tag=hdr&1023
 if size==4095:size=struct.unpack_from('<I',body,at)[0];at+=4
 payload=body[at:at+size];at+=size;idx+=1
 if tag==67:
  text=payload.decode('utf-16le',errors='replace')
  if any(k in text for k in ['순환소수','9수01-06','9수01-07','9수01-08','9수01-09','9수01-10']):
   hits.append({'record1based':idx,'tag':tag,'payloadSha256':hashlib.sha256(payload).hexdigest(),'shortText':text[:260]})
assert any('순환소수' in x['shortText'] and '9수01-06' in x['shortText'] for x in hits)
result={'url':url,'documentSha256':sha,'stream':'BodyText/Section0','relevantActualRecords':hits,'ownParaphrase':'순환소수의 뜻과 유리수·순환소수의 관계가 실제2015성취기준9수01-06에 있으며,제곱근·무리수·실수대소·근호계산은9수01-07/08/09/10이다. 실제M3 root배치는 이전직접본경기도교육청PDFpage38과 결합한다. 중2정확unitUUID/별도학년표를이실행으로인증하지않고 순환소수 학습후 배정조건을명시한다.','diagnostics':{'goePdfFindCyclic':'No matching text; preserved as failed text search, not evidence that topic is absent or out-of-grade.','pdfUrl':'https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202202101132253081.pdf'},'fullPrimaryLocalOnlyNotToStage':local.name,'utf8WriteReadPassed':True}
with (p/'own-q07-review-primary-evidence.json').open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
print('MOE primary hash verified; relevant records',[(x['record1based'],x['shortText'][:90]) for x in hits]);print('Full HWP local only; not staged')
