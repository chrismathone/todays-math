"""Apply pinned data; preserve Root-only validation and legacy editable frames."""
from pathlib import Path
import hashlib, json, shutil

OUT=Path(__file__).resolve().parent
ROOT=Path.cwd()
baseline=json.loads((OUT/'baseline.json').read_text(encoding='utf-8'))
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
legacy=ROOT/'src/lib/figure/asset-editor-geometry-legacy-20261021.json'
assert not legacy.exists(), 'one-shot migration: retain existing evidence'
for row in baseline['files']:
    path=ROOT/row['path']; source=OUT/'source-5990a0d'/row['path']
    assert digest(source)==row['sourceSHA256']
    assert (digest(path) if path.exists() else None)==row.get('targetBeforeSHA256'),row['path']
for name in ['src/lib/figure/asset-editor-geometry.json',
             'src/components/unified/figure-editor/figureAssetGeometry.ts',
             'scripts/figure/build_asset_editor_registry.py',
             'scripts/figure/test_scene_assets.py','src/__tests__/unit/figureAssetEditor.test.ts']:
    target=OUT/'before'/name;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/name,target)
shutil.copyfile(ROOT/'src/lib/figure/asset-editor-geometry.json',legacy)
applied=[]
for row in baseline['files']:
    name=row['path']
    if name in ['scripts/figure/build_catalog.py','scripts/figure/engine-catalog.json']:
        continue # Root's validator-derived catalog is rebuilt, never replaced.
    target=ROOT/name;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(OUT/'source-5990a0d'/name,target);applied.append(name)
scene=ROOT/'scripts/figure/scene_assets.py'
text=scene.read_text(encoding='utf-8')
needle='    if isinstance(spec, dict) and "assets" in spec:\n'
assert text.count(needle)==1
text=text.replace(needle,needle+'        # Explicit null must not silently discard a requested picture layer.\n'
    '        if spec["assets"] is None:\n'
    '            raise ValueError("assets 는 비어 있지 않은 목록이어야 합니다")\n')
scene.write_bytes(text.encode('utf-8'))
(OUT/'apply-receipt.json').write_text(json.dumps(dict(sourceCommit=baseline['sourceCommit'],
    filesCopied=applied,legacyRegistrySHA256=digest(legacy),
    rootNullGuardRetained=True,sourceWrites=0,dbWrites=0),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Copied pinned assets and scene; preserved legacy registry and explicit-null rejection.')
