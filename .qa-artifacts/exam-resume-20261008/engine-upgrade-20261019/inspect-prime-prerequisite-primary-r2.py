import hashlib,json,pathlib,re,datetime
import fitz
root=pathlib.Path('.qa-artifacts/exam-resume-20261008/prime-prerequisite-primary-20261019-r1')
doc=fitz.open(root/'reference.local.pdf')
hits=[];edition=[]
for i in range(min(70,len(doc))):
    text=doc[i].get_text();normal=re.sub(r'\s+','',text)
    if '2015' in normal and ('교육과정' in normal):edition.append({'pdfPage1based':i+1,'normalizedHas2015AndCurriculum':True,'textSha256':hashlib.sha256(text.encode()).hexdigest()})
    if '소인수분해' in normal and '중학교1학년' in normal:
        file=root/f'page-{i+1}.local.png'
        if not file.exists():doc[i].get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(file)
        hits.append({'pdfPage1based':i+1,'textSha256':hashlib.sha256(text.encode()).hexdigest(),'renderPath':str(file),'renderSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'has9su0101':'9수01-01' in normal,'has2015':'2015' in normal})
receipt={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'documentSha256':hashlib.sha256((root/'reference.local.pdf').read_bytes()).hexdigest(),'normalization':'Whitespace removal for search only; no altered PDF or rewritten source evidence. Original r1 exact-space search with0hits retained. Actual rendered pages still required.','gradeHits':hits,'editionHits':edition,'approval':False,'dbWrites':0}
(root/'normalized-locator-r2.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,ensure_ascii=False))
