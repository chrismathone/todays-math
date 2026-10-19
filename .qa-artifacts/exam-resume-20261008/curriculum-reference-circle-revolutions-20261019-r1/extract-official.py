import urllib.request,pathlib,zipfile,io,json,hashlib,re,zlib,struct,olefile
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-circle-revolutions-20261019-r1')
url='https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=1512facbda6c234a1641ac7e9c156ca2'
data=urllib.request.urlopen(url,timeout=45).read();z=zipfile.ZipFile(io.BytesIO(data));records=[]
for n in z.namelist():
 try:name=n.encode('cp437').decode('cp949')
 except:name=n
 if re.search(r'8\]',name):
  b=z.read(n);target=out/'moe-2022-33-book8-math.hwp';target.write_bytes(b);records.append({'url':url,'zipSha256':hashlib.sha256(data).hexdigest(),'zipBytes':len(data),'archiveMember':name,'path':str(target),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
(out/'official-download-receipt.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
p=out/'moe-2022-33-book8-math.hwp';o=olefile.OleFileIO(str(p));flag=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0];paras=[]
for stream in o.listdir():
 if stream[0]=='BodyText' and stream[-1].startswith('Section'):
  raw=o.openstream(stream).read();raw=zlib.decompress(raw,-15) if flag&1 else raw;pos=0;idx=0
  while pos+4<=len(raw):
   header=struct.unpack_from('<I',raw,pos)[0];pos+=4;tag=header&1023;size=(header>>20)&4095
   if size==4095:size=struct.unpack_from('<I',raw,pos)[0];pos+=4
   payload=raw[pos:pos+size];pos+=size;idx+=1
   if tag==67:
    t=payload.decode('utf-16le',errors='strict');t=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',t).strip()
    if t:paras.append({'stream':'/'.join(stream),'record1based':idx,'text':t})
(out/'official-2022-paragraphs.json').write_text(json.dumps(paras,ensure_ascii=False,indent=2),encoding='utf-8');print('paragraphs',len(paras));print('hwp sha256',records[0]['sha256'])
