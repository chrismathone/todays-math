import pathlib,json,re,fitz,hashlib
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-circle-revolutions-20261019-r1')
p=pathlib.Path('C:/Users/user/orca/artifacts/outputs/worktree-cleanup-20261012-r1/exam-twin-curriculum-20261008/local-evidence/.qa-artifacts/exam-resume-20261008/sources/moe-2015-74-book8-math.pdf')
doc=fitz.open(p);rows=[]
keys=['6수03-02','6수04-02','6수04-03','6수03-07','6수03-08','6수01-14','6수01-16']
for i,page in enumerate(doc):
 t=page.get_text();norm=re.sub(r'[\s\x00-\x1f]','',t)
 if any(code in norm for code in keys):
  rows.append({'pdfPage1based':i+1,'text':t,'pageTextSha256':hashlib.sha256(t.encode()).hexdigest()});page.get_pixmap().save(out/f'official-2015-page-{i+1}.png')
(out/'official-2015-selected-pages.json').write_text(json.dumps({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'url':'https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=dc926a43bf953203951fb928ff098b1c','archiveMember':'별책8_수학과 교육과정.pdf','pages':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print('2015 pages',[(r['pdfPage1based']) for r in rows])
paras=json.loads((out/'official-2022-paragraphs.json').read_text(encoding='utf-8'))
selected=[r for r in paras if r['record1based']<4500 and (any(code in r['text'] for code in ['[6수01-03]','[6수01-15]','[6수02-02]','[6수02-03]','[6수02-04]','[6수03-15]','[6수03-16]','[9수02-01]','[9수02-03]','[9수02-04]','[9수02-07]','[9수03-06]']) or (any(s in r['text'] for s in ['기준량','원주율','반비례','지나치게 복잡한','수의 범위와 올림']) and r['record1based']>2700))]
(out/'official-2022-selected-provisions.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(selected,ensure_ascii=False,indent=2))
