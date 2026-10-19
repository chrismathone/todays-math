import hashlib,json,pathlib,urllib.request,datetime
import fitz
root=pathlib.Path('.qa-artifacts/exam-resume-20261008/prime-prerequisite-primary-20261019-r1')
root.mkdir()
url='https://cdn.kosac.re.kr/files/legacy_data/jnrepo/upload/jnBrdBoard/202306/95b9735c5c8b423c93cde63b11160add_1687408234715.pdf'
pdf=root/'reference.local.pdf'
with urllib.request.urlopen(url,timeout=35) as response,pdf.open('xb') as out:
    total=0
    while True:
        chunk=response.read(1024*1024)
        if not chunk:break
        total+=len(chunk)
        if total>70*1024*1024:raise ValueError('Unexpected source size')
        out.write(chunk)
digest=hashlib.sha256(pdf.read_bytes()).hexdigest()
doc=fitz.open(pdf)
hits=[]
for page_index in range(min(50,len(doc))):
    page=doc[page_index];text=page.get_text()
    if '소인수분해' in text and '중학교 1학년' in text:
        name=f'page-{page_index+1}.local.png';page.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(root/name)
        hits.append({'pdfPage1based':page_index+1,'textSha256':hashlib.sha256(text.encode()).hexdigest(),'render':name,'renderSha256':hashlib.sha256((root/name).read_bytes()).hexdigest(),'has9su0101':'9수01-01' in text,'has2015':'2015' in text,'excerpt':text[:2000]})
        if len(hits)>=3:break
receipt={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':url,'documentSha256':digest,'bytes':total,'pages':len(doc),'hits':hits,'downloadAndRendersRemainLocalReferenceOnly':True,'approval':False,'dbWrites':0}
(root/'inspection.local.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'url':url,'sha256':digest,'bytes':total,'pages':len(doc),'hits':hits},ensure_ascii=False))
