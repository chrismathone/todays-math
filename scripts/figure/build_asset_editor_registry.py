"""Generate stock geometry identities for atomic editor groups (never rights approval)."""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'scripts/figure/assets'
OUTPUT=ROOT/'src/lib/figure/asset-editor-geometry.json'
ATTRS=frozenset('x y x1 y1 x2 y2 cx cy r rx ry width height d points transform'.split())
TAGS=frozenset('g path rect line circle ellipse polygon polyline'.split())

def canonical(node):
    tag=node.tag.rsplit('}',1)[-1]
    if tag not in TAGS or (node.text or '').strip():raise ValueError(f'unsupported asset geometry: {tag}')
    attrs=[[k,re.sub(r'\s+',' ',v.strip())] for k,v in sorted(node.attrib.items()) if k in ATTRS]
    return [tag,attrs,[canonical(child) for child in node]]

def build():
    rows={}
    for manifest in sorted(ASSETS.glob('manifest*.json')):
        for asset in json.loads(manifest.read_text(encoding='utf-8'))['assets']:
            slug=asset['slug'];assert slug not in rows
            source=(ASSETS/asset['file']).read_bytes();root=ET.fromstring(source)
            signature=json.dumps([canonical(child) for child in root],ensure_ascii=False,separators=(',',':'))
            rows[slug]=dict(viewBox=asset['viewBox'],signature=signature,sourceSHA256=hashlib.sha256(source.replace(b'\r\n',b'\n')).hexdigest())
    assert len(rows)==39
    return dict(policy='stock-geometry-identity-only-not-provenance-or-rights-approval',sourceDigestKind='sha256-utf8-lf',assets=dict(sorted(rows.items())))

if __name__=='__main__':
    OUTPUT.write_bytes((json.dumps(build(),ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    print(f'Asset editor registry: 39 stock geometry identities -> {OUTPUT.relative_to(ROOT)}')
