"""Actual Root editor with a preserved legacy39 scene and current41 insertion."""
from pathlib import Path
import json,hashlib
OUT=Path(__file__).resolve().parent;browser=OUT/'browser';browser.mkdir(exist_ok=True)
prior=OUT.parent/'assets-editor-integration-20261021-r1/browser'
for name in ['index.html','fixture.tsx','fixture-source.json','globals-bounded.css']:
    (browser/name).write_bytes((prior/name).read_bytes())
(browser/'origin.json').write_bytes((json.dumps(dict(legacy39FixtureSHA256=hashlib.sha256((browser/'fixture-source.json').read_bytes()).hexdigest(),
    actualRootComponent=True,originalExam=False,APIAndDBCalls=0),indent=2)+'\n').encode('utf-8'))
runner=(OUT.parent/'assets-editor-integration-20261021-r1/run_browser_bounded.py').read_text(encoding='utf-8')
runner=runner.replace("minimumGiB=2,","minimumGiB=2.5,").replace("<2:","<2.5:")
(OUT/'run_browser_bounded.py').write_bytes(runner.encode('utf-8'))
