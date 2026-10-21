"""Read-only renderer diagnostic: dump to QA, never replace the golden fixture."""
from pathlib import Path
import hashlib
import json
import re

E=Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019')
source=Path('src/__tests__/unit/renderParity.test.tsx')
fixture=Path('src/__tests__/fixtures/renderParity.json')
before=source.read_bytes()
text=before.decode('utf-8').replace('\r\n','\n')
text,count=re.subn(r'const FIXTURE = path\.join\(\s*process\.cwd\(\),\s*"src/__tests__/fixtures/renderParity\.json",\s*\);',
    'const FIXTURE = path.join(process.cwd(), ".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/parity-actual-20261021-r1.json");',text)
assert count==1
text=text.replace('const DUMP = Boolean(process.env.PARITY_DUMP);','const DUMP = true;')
target=E/'parity-readonly-diagnostic-20261021-r1.test.tsx'
assert not target.exists()
target.write_bytes(text.encode('utf-8'))
(E/'parity-diagnostic-before-20261021-r1.json').write_bytes((json.dumps(dict(
    source=dict(path=source.as_posix(),sha256=hashlib.sha256(before).hexdigest()),
    golden=dict(path=fixture.as_posix(),sha256=hashlib.sha256(fixture.read_bytes()).hexdigest()),
    diagnosticCopy=target.as_posix(),diagnosticIsNotGoldenApproval=True,
    onlyOutputTargetAndDiagnosticDumpFlagChanged=True,productionFilesWritten=0),indent=2)+'\n').encode())
print('Prepared QA-only HTML hash dump; golden untouched')
