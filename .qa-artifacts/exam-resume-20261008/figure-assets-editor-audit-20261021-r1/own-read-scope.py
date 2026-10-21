from pathlib import Path
import re,json,hashlib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');D=Path('D:/math-figure-editor/docs/export/todays-math/patches/05-editor-prompt-assets.patch');text=D.read_text(encoding='utf-8-sig');targets=[x for x in re.findall(r'^\+\+\+ b/(.+)$',text,re.M) if x.startswith('src/')];extra=['figureBake.ts','figureEditGeometry.ts','figureGroupSelection.ts','FigureSelectionOverlay.tsx','figureSizeLock.ts','figureRotate.ts','figureMirror.ts','figureSelection.ts','FigureEditor.tsx','figureFrame.ts','figureFlip.ts'];files=[R/x for x in targets]+[R/'src/components/unified/figure-editor'/x for x in extra]+[R/'vendor/figure-engine/core/label_markup.py',D];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();(P/'own-before.json').write_text(json.dumps({str(p):sha(p) if p.exists() else None for p in files},indent=2),encoding='utf-8');(P/'own-patch7-paths.json').write_text(json.dumps(targets,indent=2),encoding='utf-8');(P/'own-write-probe.txt').write_text('그림조각 편집 계약 정적검토·범위보존\n',encoding='utf-8')
for name,pattern in [('figureBake.ts',r'export |function (geometry|.*Point|.*Bound)|isSizeLocked|fallback|querySelector|\.type|localName'),('figureSelection.ts',r'export |isSizeLocked|type ===|localName|querySelector|transform'),('figureRotate.ts',r'.'),('figureMirror.ts',r'.')]:
 f=R/'src/components/unified/figure-editor'/name
 if not f.exists():print('MISSING '+str(f));continue
 print('\nFILE '+name)
 for i,line in enumerate(f.read_text(encoding='utf-8-sig').splitlines(),1):
  if re.search(pattern,line):print(f'{i}: {line}')
