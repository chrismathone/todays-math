from pathlib import Path
import json,hashlib,subprocess
P=Path('.qa-artifacts/exam-resume-20261008/inverse-radical-ratio-code-audit-20261020-r2');R1=P.with_name('inverse-radical-ratio-code-audit-20261020-r1');ROOT=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();S=rd(P/'provided-scope.json');rows=[]
for x in S['files']:
 row={'path':x['path'],'expected':x['sha256'],'root':h(ROOT/x['path']),'snapshot':h(P/x['snapshot']),'runtime':h(P/x['runtime'])};assert all(row[k]==x['sha256']for k in ['root','snapshot','runtime']);rows.append(row)
prior=[]
for n in ['own-audit-report.json','own-rational-oracle.json','own-controls-results.json','own-controls.mjs','own-before.json']:
 p=R1/n;assert p.read_bytes()==subprocess.check_output(['git','show','29a6f49b61d6eba80a28c70bb02b8fd3d2f052f5:'+p.as_posix()]);prior.append({'path':p.as_posix(),'sha256':h(p)})
assert h(R1/'own-audit-report.json')==S['priorTechnicalHold']['reportSha256']
actual=rd(R1/'own-before.json')['actualInputsAndOwnReview']
for x in actual:assert h(x['path'])==x['sha256']
probe='U57 R2 독립 재검사 √ getter 0회\n';(P/'own-utf8-probe.txt').write_text(probe,encoding='utf-8');assert(P/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe
(P/'own-before.json').write_text(json.dumps({'scopeSHA256':h(P/'provided-scope.json'),'sources':rows,'r1ImmutableEvidence':prior,'actualInputsAndOwnReview':actual,'probeSHA256':h(P/'own-utf8-probe.txt')},indent=2)+'\n',encoding='utf-8')
s=(R1/'own-controls.mjs').read_text(encoding='utf-8-sig');s=s.replace("'./own-rational-oracle.json'","'../inverse-radical-ratio-code-audit-20261020-r1/own-rational-oracle.json'").replace("'./own-controls-results.json'","'./own-r1-replay-results.json'");(P/'own-r1-replay.mjs').write_text(s,encoding='utf-8');print(json.dumps({'sourceFiles':len(rows),'priorEvidence':len(prior),'actualInputs':len(actual),'oracleUnchanged':True}))
