from pathlib import Path
import urllib.request,json,hashlib,datetime,fitz,olefile,struct,zlib,re
P=Path(__file__).resolve().parent;L=P/'own-local-primary';receipts=[]
urls={'moe2022notice':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401&opType=N','typesafe-index':'https://docs.typesafe.ai/llms.txt','typesafe-confidence':'https://docs.typesafe.ai/confidence','typesafe-building':'https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md','moe2015notice':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=60747&lev=0&m=040401&opType=N','moe2020math':'https://www.moe.go.kr/boardCnts/fileDown.do?m=0404&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84'}
for name,url in urls.items():
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r:b=r.read(8*1024*1024);status=r.status
  path=L/(name+'.local');path.write_bytes(b);receipts.append({'name':name,'url':url,'status':status,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'path':str(path)});print(name,status,len(b))
 except Exception as e:receipts.append({'name':name,'url':url,'failure':str(e)});print(name,'FAILED',type(e).__name__)
(P/'own-live-receipts.json').write_text(json.dumps({'retrievedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requests':receipts},ensure_ascii=False,indent=2),encoding='utf-8')
hwp=L/'moe2020math.local'
if hwp.exists():
 b=hwp.read_bytes();assert hashlib.sha256(b).hexdigest()=='1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb';o=olefile.OleFileIO(hwp);head=o.openstream('FileHeader').read();compressed=struct.unpack_from('<I',head,36)[0]&1;rows=[]
 for key in o.listdir():
  if key[0]!='BodyText':continue
  data=o.openstream(key).read();data=zlib.decompress(data,-15) if compressed else data;pos=0;record=0
  while pos+4<=len(data):
   v=struct.unpack_from('<I',data,pos)[0];pos+=4;size=v>>20;tag=v&1023
   if size==4095:size=struct.unpack_from('<I',data,pos)[0];pos+=4
   payload=data[pos:pos+size];pos+=size;record+=1
   if tag==67:
    text=re.sub(r'[\x00-\x1f]',' ',payload.decode('utf-16le',errors='replace'))
    if any(w in text for w in ['9수04-13','9수04-14','9수04-16','9수01-07','9수01-10','제곱근과 무리수','제곱근 기호']):rows.append({'stream':'/'.join(key),'record1based':record,'paragraphSHA256':hashlib.sha256(payload).hexdigest(),'text':text})
 (P/'own-2015-consolidated-locators.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
