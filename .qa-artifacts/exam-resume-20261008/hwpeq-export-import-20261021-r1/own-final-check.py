from pathlib import Path
import json,hashlib,importlib.util,textwrap,ast
P=Path(__file__).resolve().parent;W=Path.cwd();D=Path('D:/시험지 한글화');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
s=(D/'tests/test_render_fixes.py').read_text(encoding='utf-8-sig');start=s.index('    # ── O9:');end=s.index('    # ── O6:',start);block=textwrap.dedent(s[start:end]);(P/'own-reused-pure-tests.py').write_text(block,encoding='utf-8')
spec=importlib.util.spec_from_file_location('localcopy',P/'own-inputs/patched.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);checks=[]
def chk(name,ok):checks.append({'name':name,'passed':bool(ok)})
exec(compile(block,'own-reused-pure-tests.py','exec'),{'chk':chk,'latex_to_hwpeq':m.latex_to_hwpeq});assert all(x['passed'] for x in checks)
old=ast.parse((P/'own-inputs/baseline.py').read_text(encoding='utf-8-sig'));new=ast.parse((P/'own-inputs/patched.py').read_text(encoding='utf-8-sig'))
def maps(t):return {n.targets[0].id:ast.dump(n.value) for n in ast.walk(t) if isinstance(n,ast.Assign) and len(n.targets)==1 and isinstance(n.targets[0],ast.Name) and n.targets[0].id.endswith('_MAP')}
assert maps(old)==maps(new)
normalize=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n')
assert normalize(W/'vendor/hwpx/latex_to_hwpeq.py')==normalize(P/'own-inputs/dropin.py')
before=json.loads((P/'own-before.json').read_text(encoding='utf-8-sig'));after={p:sha(Path(p)) for p in before};external_unchanged=all(after[p]==v for p,v in before.items() if Path(p)!=W/'vendor/hwpx/latex_to_hwpeq.py');assert external_unchanged
r={'reusedO9':checks,'mapIntegrity':True,'dropinNormalizedByteBinding':True,'dropinRawByteBinding':(W/'vendor/hwpx/latex_to_hwpeq.py').read_bytes()==(P/'own-inputs/dropin.py').read_bytes(),'externalAndParentUnchanged':external_unchanged,'afterHashes':after,'patchedSHA256':sha(W/'vendor/hwpx/latex_to_hwpeq.py'),'normalizedSHA256':hashlib.sha256(normalize(W/'vendor/hwpx/latex_to_hwpeq.py').encode()).hexdigest()}
(P/'own-final-checks.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'reused':len(checks),'passed':sum(x['passed'] for x in checks),'patchedSHA256':r['patchedSHA256']}))
