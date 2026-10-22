"""Bind one removed EOF blank line without rewriting any old test evidence."""
from pathlib import Path
import hashlib,json,subprocess
out=Path(__file__).resolve().parent
rel='src/lib/figure/exportImage.ts'
oldHash=json.loads((out/'port-related-r6-execution.json').read_text(encoding='utf-8'))['sourceSHA256'][rel]
staged=subprocess.check_output(['git','show',':'+rel])
variants=[staged,staged.replace(b'\r\n',b'\n'),staged.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')]
if(out/'pre-format-exportImage.ts').exists():variants.append((out/'pre-format-exportImage.ts').read_bytes())
old=next(raw for raw in variants if hashlib.sha256(raw).hexdigest()==oldHash)
current=Path(rel).read_bytes()
assert old.rstrip(b'\r\n')==current.rstrip(b'\r\n')
assert current.endswith(b'\n')and not current.rstrip(b'\r\n').endswith(b'\n')
assert len(old)>len(current)
snapshot=out/'pre-format-exportImage.ts';snapshot.write_bytes(old)
report={'path':rel,'validatedPreviousRawSHA256':oldHash,'currentRawSHA256':hashlib.sha256(current).hexdigest(),'previousSnapshot':snapshot.name,'difference':'removed EOF blank line only; all other bytes identical','exactContentBeforeTrailingLineEndingsEqual':True,'tokensAndBehaviorUnchanged':True,'oldEvidenceFilesModified':False,'newTestRunClaim':False}
(out/'eof-format-binding-r1.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps(report))
