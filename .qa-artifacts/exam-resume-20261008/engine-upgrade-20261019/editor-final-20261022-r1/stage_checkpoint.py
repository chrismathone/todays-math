from pathlib import Path
import json,subprocess
out=Path(__file__).resolve().parent
validation=json.loads((out/'final-validation-r1.json').read_text(encoding='utf-8'))
paths=[r['path']for r in validation['code']]
paths+=['.gitattributes','docs/planning/tracks/reports/exam-engine-editor-final-20261022.md','.qa-artifacts/exam-resume-20261008/engine-upgrades-progress-r69.json','.qa-artifacts/exam-resume-20261008/continuation-index.json']
names=['root-files.json','run_checks.py','check_types.mjs','freeze_source.py','prepare_upstream_input_r2.py','finalize_evidence.py','stage_checkpoint.py','push_checkpoint.py','source-snapshot-manifest-r1.json','source-final-manifest-r2.json','mathlive-registry-0.111.1.json','final-validation-r1.json','production-and-test-files-r1.json','preserved-m5-unverified.patch','upstream-input-fixes-unidiff-zero-r2.patch','upstream-input-manifest-r2.json','types-port-types-r2.json']
names+=['bind_eof_format.py','eof-format-binding-r1.json','pre-format-exportImage.ts']
names+=['.gitattributes']
names+=['affordance-r1.json','affordance-r1.log']
paths +=[(out/name).relative_to(Path.cwd()).as_posix()for name in names if(out/name).exists()]
paths +=[p.relative_to(Path.cwd()).as_posix()for p in out.glob('port-*')if p.suffix in ['.json','.log']]
paths +=[p.relative_to(Path.cwd()).as_posix()for folder in ['source-final','upstream-input-candidate-r2']for p in(out/folder).rglob('*')if p.is_file()]
browser=out/'browser'
paths +=[(browser/name).relative_to(Path.cwd()).as_posix()for name in ['fixture.tsx','fixture-source.json','globals-bounded.css','index.html','verify.mjs']]
paths +=[p.relative_to(Path.cwd()).as_posix()for p in browser.glob('browser-results-*.json')]
paths +=[p.relative_to(Path.cwd()).as_posix()for p in browser.glob('*port-browser-r7.png')]
receipt=out.parent/'arrow-sync-20261022-r1/push-receipt-r1.json'
if receipt.exists():paths.append(receipt.relative_to(Path.cwd()).as_posix())
paths=sorted(set(paths))
assert 'src/__tests__/unit/middleM3Stat2.test.ts'not in paths
assert not any('node_modules'in p or 'cache'in p for p in paths)
subprocess.run(['git','add','-f','--pathspec-from-file=-','--pathspec-file-nul'],input=b''.join(p.encode()+b'\0'for p in paths),check=True)
staged=subprocess.check_output(['git','diff','--cached','--name-only','-z']).decode().split('\0')
assert all(not p or p in paths for p in staged)
subprocess.run(['git','diff','--cached','--check'],check=True)
print(json.dumps({'stagedFiles':len([p for p in staged if p]),'excludedUnverifiedM5Test':True}))
