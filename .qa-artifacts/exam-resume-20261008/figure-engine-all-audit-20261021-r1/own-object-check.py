from pathlib import Path
import json,re,hashlib,subprocess
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');patch=Path('D:/math-figure-editor/docs/export/todays-math/patches/06-engine-all.patch');rows=[]
for s in re.split(r'(?=^diff --git )',patch.read_text(encoding='utf-8-sig'),flags=re.M):
 if not s.startswith('diff --git '):continue
 old,new=re.search(r'^index ([0-9a-f]+)\.\.([0-9a-f]+)',s,re.M).groups();target=re.search(r'^\+\+\+ b/(.+)$',s,re.M)[1];base=b'' if set(old)=={'0'} else subprocess.run(['git','-C',str(R),'cat-file','blob',old],capture_output=True,check=True).stdout;lines=base.decode('utf-8-sig').splitlines();out=[];pos=0
 for h in re.split(r'(?=^@@ )',s,flags=re.M)[1:]:
  start=max(0,int(re.match(r'@@ -(\d+)',h)[1])-1);out+=lines[pos:start];pos=start
  for line in h.splitlines()[1:]:
   if line.startswith(' '):assert lines[pos]==line[1:];out.append(line[1:]);pos+=1
   elif line.startswith('-'):assert lines[pos]==line[1:];pos+=1
   elif line.startswith('+'):out.append(line[1:])
 out+=lines[pos:];data=('\n'.join(out)+'\n').encode();blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();rows.append({'path':target,'reconstructedGitBlob':blob,'patchIncomingPrefix':new,'matches':blob.startswith(new)})
(P/'own-incoming-object-checks.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');print(json.dumps({'staticBlobChecks':len(rows),'matches':sum(x['matches'] for x in rows)}))
