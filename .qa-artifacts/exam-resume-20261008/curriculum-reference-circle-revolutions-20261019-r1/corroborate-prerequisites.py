import pathlib,json,re,hashlib,zlib,struct,olefile,fitz
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-circle-revolutions-20261019-r1')
base=pathlib.Path('C:/Users/user/orca/artifacts/outputs/worktree-cleanup-20261012-r1/exam-twin-curriculum-20261008/local-evidence/.qa-artifacts/exam-resume-20261008/sources')
p=base/'moe-2020-236-book8-math.hwp'; o=olefile.OleFileIO(str(p)); compressed=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0]&1
wanted=['6수03-02','6수03-07','6수03-08','6수04-02','6수04-03','6수04-04','6수01-14','6수01-16']
selected=[]
for stream in o.listdir():
 if stream[0]!='BodyText':continue
 b=o.openstream(stream).read();b=zlib.decompress(b,-15) if compressed else b;pos=0;idx=0
 while pos+4<=len(b):
  header=struct.unpack_from('<I',b,pos)[0];pos+=4;tag=header&1023;size=(header>>20)&4095
  if size==4095:size=struct.unpack_from('<I',b,pos)[0];pos+=4
  payload=b[pos:pos+size];pos+=size;idx+=1
  if tag==67:
   t=payload.decode('utf-16le');t=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',t).strip()
   if any(code in t for code in wanted) or ('기준량' in t and idx<3600): selected.append({'stream':'/'.join(stream),'record1based':idx,'text':t})
(out/'official-2015-edition-2020-corroboration.json').write_text(json.dumps({'source':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'url':'https://www.moe.go.kr/boardCnts/fileDown.do?m=0404&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84','edition':'2015 revised, MOE2020-236 Book8','provisions':selected},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(selected,ensure_ascii=False,indent=2))
ref=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-evidence.json');j=json.loads(ref.read_text(encoding='utf-8'))
r=[x for x in j['achievement_standards'] if x['code'] in ['6수03-08','9수03-03']]
(out/'project-standard-crosswalk.json').write_text(json.dumps({'source':str(ref),'sha256':hashlib.sha256(ref.read_bytes()).hexdigest(),'selectedExistingStandardRecords':r,'warning':'2015 9수03-03 is inverse proportion. 2022 inverse proportion is 9수02-07; never transplant a standard code without edition. Project records are indexes and were checked against actual official content for relevant methods.'},ensure_ascii=False,indent=2),encoding='utf-8')
