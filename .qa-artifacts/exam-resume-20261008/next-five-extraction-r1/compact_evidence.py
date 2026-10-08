"""Lossless storage encoding of our own audit renders, never source files.
Pixel equality is checked before removing only this folder's generated PNG.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

HERE=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
changes=[]
for name in ['scan-render-index.json','additional-scan-index.json']:
    ip=HERE/name
    data=json.loads(ip.read_text('utf-8'))
    for paper in data if isinstance(data,list) else [data]:
        for row in paper['pages']:
            old=(HERE/row['render']).resolve()
            if old.suffix!='.png':continue
            assert old.is_relative_to(HERE)
            new=old.with_suffix('.webp')
            with Image.open(old) as im:
                before=im.convert('RGB');pixels=before.tobytes()
                before.save(new,format='WEBP',lossless=True,method=4)
            with Image.open(new) as im:
                assert im.convert('RGB').tobytes()==pixels
            old_sha=sha(old)
            row.update({'render':str(new.relative_to(HERE)),'renderSha256':sha(new),'inspectedPngSha256':old_sha,
                'renderEncoding':'lossless_webp','pixelsUnchangedFromViewedPng':True,'pixelRgbSha256':hashlib.sha256(pixels).hexdigest()})
            changes.append({'originalGeneratedRender':str(old.relative_to(HERE)),'retainedRender':str(new.relative_to(HERE)),
                'originalRenderSha256':old_sha,'retainedRenderSha256':sha(new),'pixelEquality':True})
            old.unlink()
    ip.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
for old in HERE.glob('*/evidence/scan-contact-sheet.png'):
    assert old.resolve().is_relative_to(HERE)
    with Image.open(old) as im:im.save(old.with_suffix('.webp'),format='WEBP',lossless=True,method=4)
    old.unlink()
if changes:
    (HERE/'render-encoding-evidence.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Lossless audit render encodings:',len(changes),flush=True)
