"""Fetch the lockfile's exact KaTeX into private QA deps, never shared modules."""
from pathlib import Path
import base64
import hashlib
import io
import json
import tarfile
import urllib.request

E = Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019')
OUT = E / '.local-katex-0.18.2'
assert not OUT.exists()
entry = json.loads(Path('package-lock.json').read_text(encoding='utf-8'))['packages']['node_modules/katex']
assert entry['version']=='0.18.2' and entry['resolved'].startswith('https://registry.npmjs.org/katex/-/')
with urllib.request.urlopen(entry['resolved'], timeout=30) as response:
    data = response.read(32 * 1024 * 1024)
assert len(data)<32*1024*1024
assert 'sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()==entry['integrity']
OUT.mkdir()
selected=[]
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
    for member in archive.getmembers():
        name=member.name
        allowed=name in ['package/package.json','package/LICENSE','package/dist/katex.mjs','package/dist/katex.min.css'] or (name.startswith('package/dist/fonts/') and name.endswith('.woff2'))
        if not allowed:continue
        assert member.isfile() and '..' not in Path(name).parts
        target=OUT/name
        target.parent.mkdir(parents=True,exist_ok=True)
        raw=archive.extractfile(member).read()
        target.write_bytes(raw)
        selected.append(dict(path=target.as_posix(),sha256=hashlib.sha256(raw).hexdigest()))
receipt=dict(kind='lock-pinned-test-dependency-overlay/v1', package='katex',version=entry['version'],
    installedSharedVersion=json.loads(Path('node_modules/katex/package.json').read_text(encoding='utf-8'))['version'],
    resolved=entry['resolved'],integrity=entry['integrity'],integrityVerified=True,
    files=selected,sharedNodeModulesChanges=0,npmInstallOrPrismaGenerate=0,
    thirdPartyPackageFilesMustRemainUntracked=True)
(E/'locked-katex-receipt-20261021-r1.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
print(json.dumps(dict(privatePackageVersion=entry['version'],files=len(selected),sharedModuleChanges=0)))
