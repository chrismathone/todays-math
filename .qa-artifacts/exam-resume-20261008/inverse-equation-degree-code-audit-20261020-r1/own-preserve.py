from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parent; Q=P.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=Q/'inverse-equation-degree-proposal-20261020-r1/own-raw-solutions-r1.json'
repo=Path.cwd(); rel=raw.relative_to(repo).as_posix(); blob=subprocess.check_output(['git','show','18f924cba009bfb3dd2cc3a507122bd7aeb0f3b0:'+rel]); assert blob==raw.read_bytes()
before=json.loads((P/'own-before.json').read_text());after={p:sha(Path(p).read_bytes()) for p in before};assert before==after
(P/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
(P/'own-preservation-receipt.json').write_text(json.dumps({'bindings':len(before),'beforeAfterEqual':before==after,'ownRawGitCommit':'18f924cba009bfb3dd2cc3a507122bd7aeb0f3b0','rawBlobWorkingExact':True,'rawSHA256':sha(blob),'parentProofSHA256':sha((P/'git-raw-before-private.json').read_bytes()),'root7AndForensic7Verified':True,'metadataR2NoNewStudentCount':True,'sourceEdits':0},indent=2),encoding='utf-8')
print('raw Git exact; all',len(before),'before/after inputs equal')
