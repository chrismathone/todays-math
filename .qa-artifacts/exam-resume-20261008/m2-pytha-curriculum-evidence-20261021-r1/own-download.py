from pathlib import Path
import json,hashlib,urllib.request,zipfile,io,importlib.util
P=Path('.qa-artifacts/exam-resume-20261008/m2-pytha-curriculum-evidence-20261021-r1');L=P/'own-local-primary';L.mkdir(exist_ok=True)
pdf=Path('.qa-artifacts/exam-resume-20261008/gyeongsang-q13-r5-review-r1/official/moe-2015-74-book8-math.pdf');assert hashlib.sha256(pdf.read_bytes()).hexdigest()=='4bd2b84e978865a71d90577d8eb6240f0ecf24a9884642d627cde460d71ab88e'
print('existing2015PDF exactknownhash matched; readers:',{n:importlib.util.find_spec(n) is not None for n in ['fitz','pypdf','olefile']})
u='https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=1512facbda6c234a1641ac7e9c156ca2';req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
with urllib.request.urlopen(req,timeout=60) as resp:data=resp.read(22*1024*1024)
print('2022 primary bytes',len(data),'header',data[:8]);(L/'moe2022-download.local.bin').write_bytes(data)
receipt={'url':u,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
if zipfile.is_zipfile(io.BytesIO(data)):
 z=zipfile.ZipFile(io.BytesIO(data));names=z.namelist();receipt['archiveMembers']=names
 for n in names:
  try:display=n.encode('cp437').decode('cp949')
  except Exception:display=n
  if '수학' in display or '8]' in display or '8_' in display:
   b=z.read(n);target=L/('math2022.local'+Path(display).suffix);target.write_bytes(b);receipt.setdefault('selectedMembers',[]).append({'member':display,'path':str(target),'sha256':hashlib.sha256(b).hexdigest()});print('selected',display,len(b))
(P/'own-download-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
