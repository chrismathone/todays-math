from pathlib import Path
import hashlib,json
p=Path('.qa-artifacts/exam-resume-20261008/inverse-dispersion-numbered-code-audit-20261020-r1')
read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'))
b=read(p/'own-source-before.json'); sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');scope=read(p/'provided-scope.json');rows=[]
for x in scope['files']:
 r={'path':x['path'],'expected':x['sha256'],'root':sha(root/x['path']),'snapshot':sha(p/x['snapshot']),'runtime':sha(p/x['runtime'])};assert all(r[k]==r['expected'] for k in ['root','snapshot','runtime']);rows.append(r)
a=[{'path':x['path'],'sha256':sha(Path(x['path']))} for x in b['artifacts']];assert a==b['artifacts']
(p/'own-source-after.json').write_text(json.dumps({'files':rows,'artifacts':a,'all14BeforeAfterEqual':rows==b['files'],'all6RawReportsBeforeAfterEqual':True},indent=2)+'\n',encoding='utf-8')
r=read(p/'own-control-results.json');r['exactOracleCases']=len(read(p/'own-exact-oracle.json')['cases']);print(json.dumps({'summary':r['summary'],'actualCollector':r['collector'],'validationMocked':r['validationMocked'],'beforeAfter':True},indent=2))
