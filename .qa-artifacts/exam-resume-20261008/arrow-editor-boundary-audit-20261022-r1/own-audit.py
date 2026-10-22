from pathlib import Path
import sys,json,hashlib,xml.etree.ElementTree as ET,subprocess
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
dump=lambda n,v:(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
E=R/'src/components/unified/figure-editor'
files=[R/'scripts/figure/graph_scene.py',R/'vendor/figure-engine/core/figure_svg.py']+[E/n for n in ['figureSvgEditing.ts','figureHandles.ts','figureEditGeometry.ts','figureBake.ts','FigureEditor.tsx']]
before={str(f):sha(f)for f in files};dump('own-before.json',before)
head=subprocess.check_output(['git','-C',str(R),'rev-parse','HEAD'],text=True).strip();assert head=='327dcc540733e3bbd53ee4875daecba9294d5f4a'
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
from graph_scene import render_graph
records=[]
for name,start,end,arrow in [('horizontal',[1,2],[8,2],True),('diagonal',[1,1],[8,7],True),('reverse',[8,7],[1,1],True),('short',[1,1],[1.01,1],True),('plain',[1,1],[8,7],False)]:
 spec={'version':'graph-1','xRange':[0,10],'yRange':[0,10],'axes':False,'segments':[{'from':start,'to':end,'arrow':arrow}]}
 svg=render_graph(spec);root=ET.fromstring(svg);shapes=[n for n in root if n.tag.rsplit('}',1)[-1]in ['line','polygon','path']];assert len(shapes)==(2 if arrow else 1)
 records.append({'id':name,'input':spec,'svg':svg,'directShapes':[{'type':n.tag.rsplit('}',1)[-1],'attrs':dict(n.attrib)}for n in shapes],'expectedImporterObjectsByCurrentSelector':len(shapes),'expectedArrowToolObjects':1 if arrow else None})
dump('own-render-repro.json',records)
after={p:sha(Path(p))for p in before};assert before==after;dump('own-after.json',after)
report={
 'scope':'Read-only arrow editor-boundary diagnosis at exact parent HEAD327dcc540; no production changes',
 'parentHEAD':head,'ownActualPythonGraphRenders':5,'ownDOMorTSExecutions':0,'sourceUnchanged':True,
 'observedSource':[
  'graph_scene.py:226-234 emits a separate engine_line followed by a filled polygon for arrow segments and axes. Head is fixed screen depth8/halfwidth3, serialized to3 decimals; zero length omits head.',
  'figureSvgEditing.ts:253 selector enumerates line/polygon separately unless inside defs/marker/grid or matching registered asset. Generic g is not a single-object exception. Thus generated arrow gets shaft+triangle objects by current source contract; Python outputs reproduce those two siblings, not a JS DOM execution.',
  'addFigureObject arrow at583-618 creates one line with marker-end, marker under defs. Existing parser skips marker descendants, so editor arrow tool remains one object. Its generic marker geometry differs from engine triangle sizing; blindly replacing with tool default can change visible endpoint/size.',
  'figureHandles.ts line returns two endpoint controls; polygon returns its vertex controls. moveFigureHandle edits only selected object by id. FigureEditor movement transforms selected ids, so selecting only shaft cannot update an independently numbered head; selecting both/grouping may move them together but does not create native arrow endpoint semantics.',
 ],
 'boundedReproduction':'Five actual Python outputs recorded: horizontal/diagonal/reverse/short arrow each line+polygon; plain line one. No screenshot/DOM/UI interaction or whole-engine claim. Short arrow length below8 screen units can have head extend behind start: compatibility edge, not justification to silently reshape.',
 'recommendedBoundary':[
  'Prefer explicit trusted import context from the generated source/spec or a transient render-to-editor correspondence receipt. Verify exact actual source SVG hash plus segment-to-sibling correspondence, then canonicalize only identified engine arrows in the editable derivative before object IDs/numbers. Original engine SVG/export bytes and original saved source remain unchanged.',
  'Represent identified arrow as one line with a local marker, using an exact dedicated userSpaceOnUse marker matching current engine head depth8/halfwidth3 and tip/ref placement, inherited fill/stroke/dash semantics verified; do NOT use the current generic tool marker blindly. Alternatively a dedicated typed compound object requires endpoint recomputation, selection, bake and description changes; generic group alone is insufficient.',
  'Geometry recognition may support a preview/explicit user combine action: same parent/transform context, adjacent exclusive line+triangle, finite nonzero line, tip=end, symmetric perpendicular base, expected exact engine serialization and style, no extra labels/clips/ids/markers/shared references. Reject ambiguous multi-match, modified, nested or transformed inputs unless all transforms are explicitly resolved. Keep all original elements on uncertainty.',
  'A geometrically identical ordinary triangle at a line endpoint is indistinguishable from an arrow in arbitrary SVG. Therefore no generic auto-merge of arbitrary triangles can be proved safe by geometry alone. Source provenance or explicit user intent is required for automatic canonicalization.',
 ],
 'requiredFutureControls':['One object and two endpoint handles after prepare/reimport; moving either endpoint updates head orientation and position.','Move/rotate/reflect/resize/bake/clipboard/undo/redo/delete/restore preserve arrow and ids/numbers; local marker URL uniqueness and sanitizer safety.','Horizontal/vertical/diagonal/reversed/short/dashed/zero-length/transformed arrows and axes; distinguish math triangle, independent polygon, ambiguous siblings and edited head.','Raw engine default fixture bytes unchanged; editable canonical derivative visual geometry matches original, export/save contracts explicit; no global triangle matching.'],
 'limits':'No Node/browser/API/model/DB, no production or sourceD writes, no student math/grade/rights/native approval. Existing dirty files preserved. SourceD analogues not needed/read. Initial guessed src/lib paths absent; actual components/unified/figure-editor paths used. One shell rg quoting diagnostic failed and was replaced with targeted source reads.'}
dump('own-report.json',report);print(json.dumps({'actualPythonRenders':5,'reportSHA256':sha(P/'own-report.json')}))
