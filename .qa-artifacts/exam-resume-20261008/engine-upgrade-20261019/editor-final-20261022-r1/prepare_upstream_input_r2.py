from pathlib import Path
import hashlib,json,difflib,subprocess
out=Path(__file__).resolve().parent
rel='src/components/unified/figure-editor/FigureMathEditor.tsx'
before=(out/'source-final'/rel).read_text(encoding='utf-8')
after=(out/'upstream-input-candidate-r2'/rel).read_text(encoding='utf-8')
target=out/'upstream-input-candidate-r2'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(after.encode())
patch=out/'upstream-input-fixes-unidiff-zero-r2.patch'
patch.write_bytes(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel,n=0)).encode())
r=subprocess.run(['git','-C','D:/math-figure-editor','apply','--check','--unidiff-zero',str(patch)],capture_output=True,text=True)
assert r.returncode==0,r.stderr
report={'sourceCommit':'129207fba40a6324cfc3c3fc365aee67c2e3bbb8','path':rel,'sourceLF_SHA256':hashlib.sha256(before.encode()).hexdigest(),'candidateLF_SHA256':hashlib.sha256(after.encode()).hexdigest(),'patchSHA256':hashlib.sha256(patch.read_bytes()).hexdigest(),'applyCheckUnidiffZeroPassed':True,'sourceRepoWrites':0,'sourceAppTestsRunByParent':False,'inertFixIsAlreadyOwnedBySourceAuthor':True,'warningTabClearWasPortDifferenceNotSourceDefect':True,'supersedes':'upstream-public-fixes-unidiff-zero.patch: do not apply earlier3-file candidate','status':'optional public input lifecycle candidate; source author reviews and runs own regression before applying'}
(out/'upstream-input-manifest-r2.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps(report))
