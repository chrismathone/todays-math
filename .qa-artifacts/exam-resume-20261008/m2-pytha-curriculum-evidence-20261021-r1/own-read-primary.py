from pathlib import Path
import json,hashlib,fitz,olefile,zlib,struct,re
P=Path(__file__).resolve().parent;pdf=Path('.qa-artifacts/exam-resume-20261008/gyeongsang-q13-r5-review-r1/official/moe-2015-74-book8-math.pdf');d=fitz.open(pdf);rows=[]
for i,page in enumerate(d):
 text=page.get_text()
 if i<50 and any(x in text for x in ['9수04-13','9수04-16','9수01-07','피타고라스 정리의 역','제곱근 기호']):
  terms=[x for x in ['9수04-13','9수04-14','9수04-16','9수01-07','피타고라스 정리의 역','제곱근 기호'] if x in text];rows.append({'physicalPage1':i+1,'pageTextSHA256':hashlib.sha256(text.encode()).hexdigest(),'terms':terms,'localText':text});print('2015physical',i+1,'terms',terms,'tail',repr(text[-90:]))
(P/'own-local-primary/2015-pages.local.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
hwp=P/'own-local-primary/math2022.local.hwp';print('2022hwpSHA',hashlib.sha256(hwp.read_bytes()).hexdigest());o=olefile.OleFileIO(hwp);header=o.openstream('FileHeader').read();compressed=bool(struct.unpack_from('<I',header,36)[0]&1);found=[];allrows=[]
for path in o.listdir():
 if path[0]!='BodyText':continue
 data=o.openstream(path).read();data=zlib.decompress(data,-15) if compressed else data;pos=0;record=0
 while pos+4<=len(data):
  v=struct.unpack_from('<I',data,pos)[0];pos+=4;tag=v&1023;size=v>>20
  if size==4095:size=struct.unpack_from('<I',data,pos)[0];pos+=4
  payload=data[pos:pos+size];pos+=size;record+=1
  if tag==67:
   text=payload.decode('utf-16le',errors='replace');text=re.sub(r'[\x00-\x1f]',' ',text);entry={'stream':'/'.join(path),'record1based':record,'text':text,'paragraphSHA256':hashlib.sha256(payload).hexdigest()};allrows.append(entry)
   if any(x in text for x in ['피타고라스','제곱근','닮음','중학교 1','근호']):found.append(entry);print(record,text[:280])
(P/'own-local-primary/2022-paragraphs.local.json').write_text(json.dumps(allrows,ensure_ascii=False),encoding='utf-8');(P/'own-primary-found.json').write_text(json.dumps({'pdf2015':[{k:v for k,v in r.items() if k!='localText'} for r in rows],'hwp2022Found':found},ensure_ascii=False,indent=2),encoding='utf-8')
