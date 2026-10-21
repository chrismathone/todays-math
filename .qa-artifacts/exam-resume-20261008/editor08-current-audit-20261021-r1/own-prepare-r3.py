from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;A=P/'own-execution-r2';E=P/'own-execution-r3';E.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
old=json.loads((A/'own-before.json').read_text(encoding='utf8'));now={f:sha(Path(f).read_bytes())for f in old}
for n in ['own-runner.cjs','own-fixtures.json','own-new-invalid-fixtures.json']:(E/n).write_bytes((A/n).read_bytes())
(E/'own-before.json').write_text(json.dumps(now,indent=2),encoding='utf8')
(E/'own-lineage.json').write_text(json.dumps({'same136InputsAndExpectations':True,'r2RunnerSHA':sha((A/'own-runner.cjs').read_bytes()),'r2RawResultsSHA':sha((A/'own-runtime-results.json').read_bytes()),'r2ReportSHA':sha((A/'own-report.json').read_bytes()),'delta':{f:{'r2':old[f],'r3':h}for f,h in now.items()if old[f]!=h}},indent=2),encoding='utf8')
(E/'own-probe.txt').write_text('UTF8 R3 · emptyattr 기대 유지/이전 증거 보존\n',encoding='utf8');assert '유지' in (E/'own-probe.txt').read_text(encoding='utf8')
print(json.dumps({'freezeFiles':len(now),'delta':sum(old[f]!=h for f,h in now.items())}))
