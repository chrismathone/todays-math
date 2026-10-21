"""Merge selected delivered features while retaining Root metadata and focus guards."""
from pathlib import Path
import json
OUT=Path(__file__).resolve().parent;IN=OUT/'incoming'
base=json.loads((OUT/'baseline.json').read_text(encoding='utf-8'))
import hashlib
for row in base['files']:
    p=Path(row['path'])
    assert (hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None)==row['beforeSHA256'],p
names=['src/components/unified/figure-editor/'+n for n in [
    'FigureAssetMenu.tsx','FigureGroupRow.tsx','FigureSelectionOverlay.tsx','figureObjectGroups.ts',
    'figureAngleMark.ts','figureEditApply.ts']]
names+=['src/lib/dev-ai/figure-edit-contract.ts','src/lib/dev-ai/figure-edit-prompt.ts']
for name in names:Path(name).write_bytes((IN/name).read_bytes())
name='src/components/unified/figure-editor/FigureEditor.tsx'
old=Path(name).read_text(encoding='utf-8');text=(IN/name).read_text(encoding='utf-8')
start=old.index('    const inEditor = (event: Event) =>');end=old.index('    const key = ',start)
a=text.index('    // 초점이 <body>');b=text.index('    const key = ',a)
text=text[:a]+old[start:end]+text[b:]
for action in ['undo','redo','delete']:
    call='remove' if action=='delete' else action
    needle=f'        case "{action}":\n          e.preventDefault();\n          {call}();\n'
    assert text.count(needle)==1
    text=text.replace(needle,needle+'          surface.current?.focus();\n')
Path(name).write_bytes(text.encode('utf-8'))
name='src/components/unified/figure-editor/figureSvgEditing.ts'
old=Path(name).read_text(encoding='utf-8');text=(IN/name).read_text(encoding='utf-8')
text=old[:old.index('export const SVG_NS')]+text
a=old.index('  // Invalid/nested/transformed metadata');b=old.index('  // 번호를 매기기 전에',a)
text=text.replace('  // 번호를 매기기 전에',old[a:b]+'  // 번호를 매기기 전에',1)
a=old.index('  // Only a matching registered stock body');b=old.index('  // 그림 조각(',a)
text=text.replace('  // 그림 조각(',old[a:b]+'  // 그림 조각(',1)
Path(name).write_bytes(text.encode('utf-8'))
name='src/lib/figure/assetCatalog.ts'
text=(IN/name).read_text(encoding='utf-8');text=text[:text.index('/**\n * 지시문에 싣는 SVG')]
text+='// Keep complete SVG bodies in review/edit evidence; a marker never authorizes stripping geometry.\n'
Path(name).write_bytes(text.encode('utf-8'))
print('Merged editor menu, group layers, cursor and explicit perspective; retained Root guards and raw bodies.')
