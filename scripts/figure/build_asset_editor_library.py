"""Publish exact sanitized stock SVG bytes at digest-named local static paths.

No network, DB changes, cleanup of old assets or licence/grade approvals.
"""
from pathlib import Path
import hashlib,json
from engine_path import ensure_on_path
ensure_on_path()
from core.figure_quality import sanitize_svg

ROOT=Path(__file__).resolve().parents[2]
REGISTRY=ROOT/'src/lib/figure/asset-editor-geometry.json'
OUT=ROOT/'public/figure-assets'

def build():
    registry=json.loads(REGISTRY.read_text(encoding='utf-8'))['assets']
    result={}
    for slug,row in registry.items():
        assert slug and all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in slug)
        raw=(ROOT/'scripts/figure/assets'/(slug+'.svg')).read_bytes().replace(b'\r\n',b'\n')
        assert hashlib.sha256(raw).hexdigest()==row['sourceSHA256'],slug
        sanitize_svg(raw.decode('utf-8')) # Validate; preserve original stock geometry bytes.
        name=row['sourceSHA256'][:16]+'-'+slug+'.svg';target=OUT/name
        if target.exists():assert target.read_bytes()==raw, 'digest path cannot be overwritten'
        else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        result[slug]=dict(url='/figure-assets/'+name,sha256=row['sourceSHA256'])
    assert len(result)==41
    return result

if __name__=='__main__':
    print(f'Published {len(build())} validated stock SVGs at content-derived local paths.')
