"""Run the real catalog generator with its single output redirected to owned QA."""
from pathlib import Path
import hashlib
import json
import sys

OUT=Path(__file__).resolve().parent
revision='-'+sys.argv[1] if len(sys.argv)>1 else ''
source=Path('scripts/figure/build_catalog.py').resolve()
before=Path('scripts/figure/engine-catalog.json').read_bytes()
code=source.read_text(encoding='utf-8')
needle="Path(__file__).with_name('engine-catalog.json').write_text"
assert code.count(needle)==1
code=code.replace(needle,"Path(owned_catalog_output).write_text",1)
sys.path.insert(0,str(source.parent))
destination=OUT/('regenerated-engine-catalog'+revision+'.json')
assert not destination.exists()
exec(compile(code,str(source),'exec'),{'__file__':str(source),'__name__':'qa_catalog_regeneration',
                                      'owned_catalog_output':str(destination)})
generated=destination.read_bytes()
assert json.loads(before)==json.loads(generated)
assert Path('scripts/figure/engine-catalog.json').read_bytes()==before
r=dict(actualGenerator=str(source),generatorSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),
 currentCatalogSHA256=hashlib.sha256(before).hexdigest(),generatedSHA256=hashlib.sha256(generated).hexdigest(),
 rawBytesEqual=before==generated,JSONSemanticEqual=True,
 normalizedNewlinesEqual=before.replace(b'\r\n',b'\n')==generated.replace(b'\r\n',b'\n'),
 productionCatalogWrites=0,dbWrites=0)
(OUT/('catalog-regeneration'+revision+'.json')).write_bytes((json.dumps(r,indent=2)+'\n').encode('utf-8'))
print(json.dumps(r))
