from pathlib import Path
import hashlib,json,re,subprocess
out=Path(__file__).resolve().parent;root=out.parents[2]
e=root/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019'
paths=['.gitattributes','docs/handoff/exam-engine-other-pc-20261022.md','.qa-artifacts/exam-resume-20261008/continuation-index.json','.qa-artifacts/exam-resume-20261008/continuation-watch/HANDOFF-20261022.json']
for folder in [out,e/'m5-scatter-final-20261022-r2',e/'m4-ownership-prototype-20261022-r1']:
    paths.extend(p.relative_to(root).as_posix()for p in folder.rglob('*')if p.is_file()and not any(s=='node_modules'or s.startswith('.vite')or s=='__pycache__'for s in p.parts))
paths.append((e/'editor-final-20261022-r1/push-receipt-r1.json').relative_to(root).as_posix())
paths=sorted(set(paths));assert not any(p.startswith('src/')or p.startswith('vendor/')for p in paths)
secret=re.compile(rb'\b(?:sk-(?!test)[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|AIza[A-Za-z0-9_-]{30,})\b')
for rel in paths:
    p=root/rel;assert p.stat().st_size<100*1024*1024
    if p.suffix not in ['.gz','.png','.jpg','.webp','.woff2']:assert not secret.search(p.read_bytes()),'Credential-like value in '+rel
subprocess.run(['git','add','-f','--pathspec-from-file=-','--pathspec-file-nul'],input=b''.join(p.encode()+b'\0'for p in paths),check=True)
staged=subprocess.check_output(['git','diff','--cached','--name-only','-z']).decode().split('\0')
assert all(not p or p in paths for p in staged)
subprocess.run(['git','diff','--cached','--check'],check=True)
for rel in paths:
    before=subprocess.check_output(['git','show',':'+rel]);after=(root/rel).read_bytes()
    assert before==after or(rel=='.gitattributes'and before.replace(b'\r\n',b'\n')==after.replace(b'\r\n',b'\n')),rel
print(json.dumps({'stagedFiles':len([p for p in staged if p]),'newProductionCodePaths':0,'capturedFilesExactBytesMatch':True,'rootAttributesOnlyLFNormalizationAllowed':True,'M5AndWorkerDraftsStoredAsUnverifiedData':True}))
