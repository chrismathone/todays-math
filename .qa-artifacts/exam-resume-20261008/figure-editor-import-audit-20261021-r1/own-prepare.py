from pathlib import Path
import json,hashlib,re,shutil,subprocess
P=Path(__file__).resolve().parent;W=Path.cwd();R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');D=Path('D:/math-figure-editor/docs/export/todays-math');S=P/'own-shadow-root';S.mkdir(exist_ok=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();patches=sorted((D/'patches').glob('0*.patch'));targets=[]
for p in patches:
 for x in re.findall(r'^\+\+\+ b/(.+)$',p.read_text(encoding='utf-8-sig'),re.M):
  assert '..' not in Path(x).parts and not Path(x).is_absolute();targets.append(x)
inputs=[D/'README.md',*patches,D/'reference/reviewFilter.ts',D/'reference/reviewFilter.test.ts',D/'reference/figureGridLabels.test.ts',R/'src/lib/dev-ai/figure-engine.ts',R/'src/components/unified/draftStore.ts',R/'DESIGN.md',R/'AGENTS.md',R/'node_modules/next/package.json',R/'node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md',R/'node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md',Path('.agents/skills/typesafe-ai/SKILL.md'),Path('C:/Users/user/.agents/skills/vercel-react-best-practices/SKILL.md')]
for x in targets:
 p=R/x;inputs.append(p)
 if p.exists():(S/x).parent.mkdir(parents=True,exist_ok=True);(S/x).write_bytes(p.read_bytes())
# Explicit minimal engine closure, copied only to own QA. No foreign repo execution.
for x in ['vendor/figure-engine/core/__init__.py','vendor/figure-engine/core/figure_svg.py','vendor/figure-engine/core/label_markup.py','scripts/figure/graph_native.py']:
 p=R/x;inputs.append(p);(S/x).parent.mkdir(parents=True,exist_ok=True);(S/x).write_bytes(p.read_bytes())
before={str(p):sha(p) if p.exists() else None for p in inputs};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');q=P/'own-command-write-probe.txt';q.write_text('이관 감사 UTF8: grid·벡터·불확실 HOLD\n',encoding='utf-8');assert '불확실' in q.read_text(encoding='utf-8')
checks=[]
for p in patches:
 check=subprocess.run(['git','-C',str(R),'apply','--check',str(p)],capture_output=True,text=True,encoding='utf-8');apply=subprocess.run(['git','apply','--unsafe-paths','--directory',str(S.relative_to(W)).replace('\\','/'),str(p)],capture_output=True,text=True,encoding='utf-8');checks.append({'patch':p.name,'sha256':sha(p),'rootReadonlyApplyCheckExit':check.returncode,'rootCheckStderr':check.stderr,'ownShadowApplyExit':apply.returncode,'ownShadowStderr':apply.stderr})
# New patch files are all in own shadow; preserve review source read-only copies.
for name in ['reviewFilter.ts','reviewFilter.test.ts','figureGridLabels.test.ts']:(P/('own-reference-'+name)).write_bytes((D/'reference'/name).read_bytes())
(P/'own-patch-comparison.json').write_text(json.dumps({'targets':targets,'checks':checks,'sourceExternalExecuted':False,'RootWrites':False,'shadowRoot':str(S)},indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=True))
