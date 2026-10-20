from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/inverse-dispersion-numbered-code-audit-20261020-r1');root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
r=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
scope=r(p/'provided-scope.json');add=r(p/'provided-scope-addendum-1.json');assert h(p/'provided-scope.json')==add['baseScope']['sha256']
rows=[]
for x in scope['files']:
 a={'path':x['path'],'expected':x['sha256'],'root':h(root/x['path']),'snapshot':h(p/x['snapshot']),'runtime':h(p/x['runtime'])};assert all(a[k]==a['expected'] for k in ['root','snapshot','runtime']);rows.append(a)
x=add['additionalData'];a={'path':x['canonicalPath'],'expected':x['sha256'],'root':h(root/x['canonicalPath']),'snapshot':h(p/x['snapshot']),'runtime':h(p/x['runtime'])};assert all(a[k]==a['expected'] for k in ['root','snapshot','runtime']);rows.append(a)
old=r(p/'own-source-before.json');art=[{'path':x['path'],'sha256':h(Path(x['path']))} for x in old['artifacts']];assert art==old['artifacts']
commit='de374451010aeff676e4cd53befc78fced6805af';names=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',commit]).decode().splitlines();sealed=[]
for name in names:
 assert name.startswith(p.as_posix()+'/own-');blob=subprocess.check_output(['git','show',commit+':'+name]);assert Path(name).read_bytes()==blob;sealed.append({'path':name,'sha256':h(Path(name))})
probe=p/'own-unmocked-utf8-probe.txt';probe.write_text('실제 수집기 독립 재검사 √2 − ④\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='실제 수집기 독립 재검사 √2 − ④\n'
out={'scopeSha256':h(p/'provided-scope.json'),'addendumSha256':h(p/'provided-scope-addendum-1.json'),'files15':rows,'rawReports':art,'priorOwnCommit':commit,'priorSealedFiles':sealed,'probeSha256':h(probe)}
(p/'own-unmocked-before.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
s=(p/'own-controls.mjs').read_text(encoding='utf-8')
s=s.replace("let collected;try{collected=auditCollectedPack(path.join(root,'package'),path.join(root,'blind'),path.join(root,'verification'));}catch(error){collected={blocked:true,message:error.message,results:[]};}","const collected=auditCollectedPack(path.join(root,'package'),path.join(root,'blind'),path.join(root,'verification'));assert(!collected.blocked);")
s=s.replace("const bindings=collected.blocked?read(path.join(root,'verification/verification-inputs.json')).map(x=>({...x,validation:{surfaceKeywordViolations:[],studentMathNotationWarnings:[],metadataAnswerFormatMismatch:false}})):currentPackage(path.join(root,'package')).bindings;","const bindings=currentPackage(path.join(root,'package')).bindings;")
s=s.replace("'own-control-results.json'","'own-unmocked-control-results.json'")
assert 'try{collected=' not in s and 'validation:{surfaceKeywordViolations:[]' not in s
(p/'own-unmocked-controls.mjs').write_text(s,encoding='utf-8')
print(json.dumps({'files':len(rows),'rawReports':len(art),'priorSealedFiles':len(sealed),'dataSha256':a['expected']},indent=2))
