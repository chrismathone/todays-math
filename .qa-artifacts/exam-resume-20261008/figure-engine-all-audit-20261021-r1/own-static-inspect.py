from pathlib import Path
import ast,json,re,hashlib,subprocess,difflib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');D=Path('D:/math-figure-editor/docs/export/todays-math');patch=D/'patches/06-engine-all.patch';checker=D/'engine-check/check_engine.py';sha=lambda b:hashlib.sha256(b).hexdigest()
text=patch.read_text(encoding='utf-8-sig');sections=re.split(r'(?=^diff --git )',text,flags=re.M);sections=[s for s in sections if s.startswith('diff --git ')];rows=[]
def git(*args):return subprocess.run(['git','-C',str(R),*args],capture_output=True)
for s in sections:
 target=re.search(r'^\+\+\+ b/(.+)$',s,re.M).group(1);assert '..' not in Path(target).parts
 old,new=re.search(r'^index ([0-9a-f]+)\.\.([0-9a-f]+)',s,re.M).groups();base=b'' if set(old)=={'0'} else git('cat-file','blob',old).stdout;available=set(old)=={'0'} or git('cat-file','-e',old).returncode==0
 current=(R/target).read_bytes() if (R/target).exists() else None;incoming=None;err=None
 try:
  if not available:raise ValueError('base blob unavailable; do not infer3way success')
  lines=base.decode('utf-8-sig').splitlines();out=[];pos=0
  for h in re.split(r'(?=^@@ )',s,flags=re.M)[1:]:
   hm=re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',h);start=max(0,int(hm[1])-1);out+=lines[pos:start];pos=start
   for line in h.splitlines()[1:]:
    if line.startswith('\\ No newline'):continue
    if line.startswith(' '):
     assert lines[pos]==line[1:];out.append(line[1:]);pos+=1
    elif line.startswith('-'):assert lines[pos]==line[1:];pos+=1
    elif line.startswith('+'):out.append(line[1:])
  out+=lines[pos:];incoming=('\n'.join(out)+'\n').encode()
 except Exception as e:err=str(e)
 norm=lambda b:b.decode('utf-8-sig').replace('\r\n','\n') if b is not None else None
 state='unresolved'
 if incoming is not None:
  state='already-incoming' if norm(current)==norm(incoming) else 'base-unchanged' if norm(current)==norm(base) else 'new-file' if current is None else 'three-way-preserve-current-delta'
 row={'path':target,'patchBaseObject':old,'patchIncomingObject':new,'baseObjectAvailable':available,'currentRawSHA256':sha(current) if current is not None else None,'baseRawSHA256':sha(base) if available else None,'reconstructedIncomingLFSHA256':sha(incoming) if incoming else None,'state':state,'reconstructionError':err}
 if target.endswith('figure_scene.py'):
  row['clearAngleLabels']={'current':bool(current and b'clear_angle_labels' in current),'incoming':bool(incoming and b'clear_angle_labels' in incoming)}
 rows.append(row)
# AST data-only evaluation: never imports or executes exporter checker.
env={}
def value(n):
 if isinstance(n,ast.Name):return env[n.id]
 if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='dict':
  assert len(n.args)==1 and all(k.arg for k in n.keywords);v=dict(value(n.args[0]));v.update({k.arg:value(k.value) for k in n.keywords});return v
 if isinstance(n,ast.Dict):return {value(k):value(v) for k,v in zip(n.keys,n.values)}
 if isinstance(n,ast.List):return [value(x) for x in n.elts]
 return ast.literal_eval(n)
for n in ast.parse(checker.read_text(encoding='utf-8-sig')).body:
 if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id in ['SCENE','CASES']:env[n.targets[0].id]=value(n.value)
fixtures=[]
for name,spec in env['CASES'].items():
 f=D/'engine-check/expected'/(name+'.json');raw=f.read_bytes();expected=json.loads(raw);fixtures.append({'name':name,'inputCanonicalSHA256':sha(json.dumps(spec,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()),'expectedPath':str(f),'expectedRawSHA256':sha(raw),'expectedBytes':len(raw),'expectedKeys':list(expected),'error':expected.get('error'),'svgBytes':len(expected.get('svg','').encode()),'contract':'exact JSON stdout bytes including SVG serialization or exact refusal wording; not all-engine equivalence'})
files=[D/'README.md',patch,checker,*[D/'engine-check/expected'/(x['name']+'.json') for x in fixtures],*[R/x['path'] for x in rows]];bindings={str(f):sha(f.read_bytes()) if f.exists() else None for f in files};(P/'own-before.json').write_text(json.dumps(bindings,indent=2),encoding='utf-8');(P/'own-52file-threeway-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8');(P/'own-six-fixture-contract.json').write_text(json.dumps(fixtures,ensure_ascii=False,indent=2),encoding='utf-8');q=P/'own-write-probe.txt';q.write_text('엔진52파일·기대6종 정적바인딩; 실행검산 아님\n',encoding='utf-8');assert '바인딩' in q.read_text(encoding='utf-8')
summary={'patchFiles':len(rows),'states':{state:sum(x['state']==state for x in rows) for state in sorted({x['state'] for x in rows})},'reconstructionErrors':[x for x in rows if x['reconstructionError']],'fixtures':len(fixtures),'externalOrRootEngineExecution':False};(P/'own-static-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=True))
