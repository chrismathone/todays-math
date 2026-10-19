import urllib.request,io,hashlib,struct,zlib,json
from pathlib import Path
import olefile
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q08q09q10-stage2-review-20261019-r1')
r=json.loads((b/'official-locators-reference.json').read_text(encoding='utf-8'))
data=urllib.request.urlopen(r['downloadUrl'],timeout=45).read()
sha=hashlib.sha256(data).hexdigest(); assert sha==r['actualDownloadedSha256']
o=olefile.OleFileIO(io.BytesIO(data)); h=o.openstream('FileHeader').read(); body=o.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',h,36)[0]&1: body=zlib.decompress(body,-15)
p=0; rec=0; selected=[]
targets={3429,3776,3788,3799,3916,3956}
while p<len(body):
    head=struct.unpack_from('<I',body,p)[0]; p+=4; tag=head&1023; size=head>>20
    if size==4095: size=struct.unpack_from('<I',body,p)[0]; p+=4
    payload=body[p:p+size]; p+=size; rec+=1
    if tag==67 and any(abs(rec-t)<=8 for t in targets):
        text=payload.decode('utf-16le',errors='replace')
        selected.append(dict(record1based=rec,text=text))
        print(rec,text)
out=dict(url=r['downloadUrl'],sha256=sha,matched=True,stream='BodyText/Section0',extraction='In-memory official HWP; compressed flag; raw deflate; sequential record headers; tag67 UTF16LE',records=selected)
with (b/'own-official-record-evidence-20261019.json').open('x',encoding='utf-8') as f: json.dump(out,f,ensure_ascii=False,indent=2)
