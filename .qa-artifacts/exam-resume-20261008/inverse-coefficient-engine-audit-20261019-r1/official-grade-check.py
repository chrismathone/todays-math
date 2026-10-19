from pathlib import Path
import urllib.request,hashlib,io,struct,zlib,json
import olefile
b=Path('.qa-artifacts/exam-resume-20261008/inverse-coefficient-engine-audit-20261019-r1')
url='https://www.moe.go.kr/boardCnts/fileDown.do?m=&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84'
data=urllib.request.urlopen(url,timeout=40).read();sha=hashlib.sha256(data).hexdigest();assert sha=='1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb'
o=olefile.OleFileIO(io.BytesIO(data));head=o.openstream('FileHeader').read();body=o.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',head,36)[0]&1:body=zlib.decompress(body,-15)
records=[];pos=0;rec=0
while pos<len(body):
 h=struct.unpack_from('<I',body,pos)[0];pos+=4;tag=h&1023;size=h>>20
 if size==4095:size=struct.unpack_from('<I',body,pos)[0];pos+=4
 payload=body[pos:pos+size];pos+=size;rec+=1
 if tag==67:
  text=payload.decode('utf-16le',errors='replace')
  if any('['+code+']' in text for code in ['9수02-01','9수02-04','9수02-05','9수02-12']):records.append(dict(record1based=rec,text=text))
# Hash the primary placement document as a stream. Do not save the full external PDF.
placement='https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf'
h=hashlib.sha256();count=0
with urllib.request.urlopen(placement,timeout=40) as response:
 while True:
  chunk=response.read(65536)
  if not chunk:break
  h.update(chunk);count+=len(chunk)
evidence=dict(primaryStandard=dict(url=url,sha256=sha,stream='BodyText/Section0',records=records),primaryPlacement=dict(url=placement,sha256=h.hexdigest(),bytes=count,document='인천광역시교육청 인천교육-2021-0141,100개의 블렌디드 수업 레시피 자료집(2탄)',locator='PDF zero-based page89 / printed90; 대상 중학교3학년; Ⅱ 문자와 식,1.다항식의 곱셈과 인수분해; 성취기준9수02-12;1~2차시 곱셈공식과 인수분해의 관계',method='Official web PDF text read of relevant page. Full external PDF never persisted; SHA256 streamed in memory.',visualLimitation='Web screenshot attempt returned cache miss; grade-placement wording was verified in extracted official page text, not layout measurement.'),era=dict(url='https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0',locator='부칙1 나/다/라; same-session primary page read',conclusion='2025중1,2026중2,2027중3부터2022적용.2025/2026중3는2015 검토 대상.'),templateMapping='새32문항의 인쇄된 수치 두 일차식 곱→동류항xy,y²계수→한 상수k의 수치 일차방정식이라는 실제 경로를9수02-12 및9수02-05에 새로 대응. q10/q11의 학년 승인을 재사용하지 않음.',year2022M3=dict(status='pending',reason='2022의 실제 중3 학년별 배치에 관한 1차자료를 이번 제한 감사에서 확보하지 않음.2015의 배치나 중학교 학년군 기준만으로 이월 승인하지 않음.'),fullExternalDocumentsSaved=False)
with (b/'official-grade-evidence.json').open('x',encoding='utf-8') as f:json.dump(evidence,f,ensure_ascii=False,indent=2)
print('Official standard codes and primary2015M3 placement hashes captured;2022M3 pending.')
