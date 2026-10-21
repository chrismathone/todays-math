from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parent;Q=P.parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();proposal=read(Q/'m38-proposal-review-20261021-r3/own-static-results.json');before={};checks=[]
for b in proposal['bindings']:
 p=R/b['path'];before[str(p)]=sha(p);checks.append({'path':b['path'],'currentSHA256':sha(p),'reviewedR3CandidateSHA256':b['candidateSHA256'],'matches':sha(p)==b['candidateSHA256']})
assert all(x['matches'] for x in checks)
for f in ['generate','types']:
 p=R/f'src/lib/middle/{f}.ts';before[str(p)]=sha(p)
for folder in ['m38-priority-math-prechange-20261021-r1','m38-priority-math-prechange-dynamic-20261021-r2','m38-proposal-review-20261021-r3']:
 for p in (Q/folder).glob('own-*'):before[str(p)]=sha(p)
(P/'own-before-execution.json').write_text(json.dumps({'hashes':before,'currentMatchesReviewedR3':checks,'ROOTHeadObserved':subprocess.check_output(['git','-C',str(R),'rev-parse','HEAD'],text=True,encoding='utf-8').strip(),'NodeExecutionAuthorizedNow':False,'NodeGORequired':True,'actualSeedOutputs':0},indent=2),encoding='utf-8')
O=Q/'m38-priority-math-prechange-dynamic-20261021-r2'
for name in ['own-guard.cjs','own-tsconfig.json']:(P/name).write_bytes((O/name).read_bytes())
s=(O/'own-runner.ts').read_text(encoding='utf-8-sig');s=s.replace("const rows:any[]=[];", "let actualGenerateCalls=0;const call=(key:string,seed:number)=>{actualGenerateCalls++;return generateMiddleProblem(key,seed,0)};const rows:any[]=[];")
s=s.replace('problem:generateMiddleProblem(key,seed,0)','problem:call(key,seed)');s=s.replace("counts:{selectedTypes:4", "actualGenerateCalls,registeredTypesCalls:1,counts:{selectedTypes:4");(P/'own-runner.ts').write_text(s,encoding='utf-8')
probe=P/'own-utf8-probe.txt';probe.write_text('수정 후 동일 cohort 준비 UTF-8 확인\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='수정 후 동일 cohort 준비 UTF-8 확인\n'
print(json.dumps({'candidateBindings':len(checks),'matches':sum(x['matches'] for x in checks),'beforeFiles':len(before),'NodeExecuted':False}))
