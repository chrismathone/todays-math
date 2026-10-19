import pathlib,olefile,struct,zlib,json,hashlib,urllib.request,fitz
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-coprime-symbolic-sum-20261019-r1')
wheel=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-circle-revolutions-20261019-r1')
p=wheel/'moe-2022-33-book8-math.hwp';o=olefile.OleFileIO(str(p));raw=zlib.decompress(o.openstream('BodyText/Section0').read(),-15);pos=0;idx=0;eq=[]
while pos+4<=len(raw):
 h=struct.unpack_from('<I',raw,pos)[0];pos+=4;tag=h&1023;size=(h>>20)&4095
 if size==4095:size=struct.unpack_from('<I',raw,pos)[0];pos+=4
 b=raw[pos:pos+size];pos+=size;idx+=1
 if tag==88 and 3590<=idx<=3830:
  length=struct.unpack_from('<H',b,4)[0];script=b[6:6+2*length].decode('utf-16le');eq.append({'record1based':idx,'tag':tag,'script':script})
(out/'official-equation-scripts.json').write_text(json.dumps({'source':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'method':'HWP compressed BodyText/Section0 record88 EQEDIT: property4 bytes, UTF16 script length2 bytes, script. Read-only original exact HWP bytes.','scripts':eq},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(eq,ensure_ascii=False,indent=2))
url='https://www.goe.go.kr/resource/goe/na/bbs_2675/2026/05/34866f8c-3e6b-45c1-84fb-4b232c919650.pdf'
data=urllib.request.urlopen(url,timeout=40).read();doc=fitz.open(stream=data,filetype='pdf');pages=[]
for i in [0,19,23,60]:
 t=doc[i].get_text();pages.append({'physicalPage1based':i+1,'text':t,'textSha256':hashlib.sha256(t.encode()).hexdigest()});doc[i].get_pixmap().save(out/f'kice-2026-page-{i+1}.png')
(out/'official-kice-2026-selected-pages.json').write_text(json.dumps({'url':url,'pdfSha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'pages':pages,'scope':'Only official title, M3 plan and M1 standards/semester statements and publication metadata; not an original-school item or incoming family output. Search tool also returned unrelated official example snippets; no target family sample was read.'},ensure_ascii=False,indent=2),encoding='utf-8')
paras=json.loads((wheel/'official-2022-paragraphs.json').read_text(encoding='utf-8'));wanted=set([3449,3453,3529,3549,3583,3604,3608,3653,3657,3661,3736,3787,3791,3795,3823,3847,3887,3891,8467,8472,8484,8490,8508]);selected=[r for r in paras if r['record1based'] in wanted]
(out/'official-2022-selected-provisions.json').write_text(json.dumps({'source':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'provisions':selected},ensure_ascii=False,indent=2),encoding='utf-8')
