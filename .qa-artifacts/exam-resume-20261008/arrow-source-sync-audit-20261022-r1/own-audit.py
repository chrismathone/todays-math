from pathlib import Path
import sys,types,subprocess,hashlib,json,math,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;D=Path('D:/math-figure-editor');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');C='69d134beb0efcaf29bc20f788929571198efcaca'
sha=lambda b:hashlib.sha256(b).hexdigest()
dump=lambda n,v:(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
paths=['docs/export/todays-math/ARROW-2026-10-22.md','src/components/unified/figure-editor/figureArrow.ts','src/components/unified/figure-editor/figureSvgEditing.ts','src/__tests__/unit/figureEngineArrows.test.ts','scripts/figure/graph_scene.py','scripts/figure/elementary.py','scripts/figure/figure_assets.py','vendor/figure-engine/core/figure_quality.py']
blobs={p:subprocess.check_output(['git','-C',str(D),'show',C+':'+p])for p in paths};dump('own-source-commit-hashes.json',{p:sha(b)for p,b in blobs.items()})
ep=R/'src/components/unified/figure-editor';rootfiles=[ep/n for n in ['figureSvgEditing.ts','figureHandles.ts','figureBake.ts']];before={str(p):sha(p.read_bytes())for p in rootfiles};dump('own-root-before.json',before)
# Only pinned committed Python sanitizer, executed in memory; no SourceD import/cache.
sys.dont_write_bytecode=True;m=types.ModuleType('own_pinned_quality');sys.modules[m.__name__]=m;exec(compile(blobs['vendor/figure-engine/core/figure_quality.py'],'pinned-figure_quality.py','exec'),m.__dict__)
wrap=lambda b:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">'+b+'</svg>'
controls=[]
cases=[('end','<g data-arrow="end"><line x1="10" y1="50" x2="100" y2="50"/><polygon points="100,50 92,47 92,53"/></g>',True),('both','<g data-arrow="both"><line x1="10" y1="50" x2="100" y2="50"/><polygon points="10,50 18,47 18,53"/><polygon points="100,50 92,47 92,53"/></g>',True),('wrong-enum','<g data-arrow="start"/>',False),('wrong-tag','<line data-arrow="end"/>',False),('external-reference','<g data-arrow="end"><line stroke="url(https://evil.test/x)"/></g>',False),('event','<g data-arrow="end" onclick="alert(1)"/>',False),('marker-input','<defs><marker id="x"/></defs>',False),('nested-valid-enum','<g data-arrow="end"><g data-arrow="end"><line/><polygon points="1,2 3,4 5,6"/></g></g>',True)]
for name,body,expected in cases:
 try:out=m.sanitize_svg(wrap(body));accepted=True;detail=sha(out.encode())
 except Exception as e:accepted=False;detail=type(e).__name__+': '+str(e)
 controls.append({'name':name,'input':wrap(body),'expectedAccept':expected,'observedAccept':accepted,'detail':detail,'pass':accepted==expected})
# Independent algebraic check of the committed dot-product marker coordinates.
roundtrips=[]
for a,b in [((10,50),(100,50)),((10,10),(10,90)),((10,10),(80,70)),((100,80),(10,20))]:
 length=math.dist(a,b);ux=(b[0]-a[0])/length;uy=(b[1]-a[1])/length
 for start in [False,True]:
  anchor=a if start else b;points=[(anchor[0]+ux*4,anchor[1]+uy*4),(anchor[0]-ux*8+uy*3,anchor[1]-uy*8-ux*3),(anchor[0]-ux*8-uy*3,anchor[1]-uy*8+ux*3)]
  local=[(ux*(x-anchor[0])+uy*(y-anchor[1]),-uy*(x-anchor[0])+ux*(y-anchor[1]))for x,y in points];back=[(anchor[0]+ux*x-uy*y,anchor[1]+uy*x+ux*y)for x,y in local];err=max(math.dist(p,q)for p,q in zip(points,back));assert err<1e-12;roundtrips.append({'from':a,'to':b,'start':start,'error':err})
# Concrete XML/style dependency witness, not a JS DOM execution.
styleFixture=wrap('<g stroke="red" fill="blue"><g data-arrow="end"><line x1="10" y1="50" x2="100" y2="50"/><polygon points="100,50 92,47 92,53"/></g></g>')
root=ET.fromstring(styleFixture);outer=root[0];poly=outer[0][1];clone=ET.fromstring(ET.tostring(poly));assert 'stroke'not in clone.attrib and 'fill'not in clone.attrib
after={p:sha(Path(p).read_bytes())for p in before};assert before==after;dump('own-root-after.json',after)
dump('own-results.json',{'pinnedSanitizerControls':controls,'markerCoordinateAlgebra':roundtrips,'styleWitness':styleFixture,'styleObservation':'Original polygon inherits red stroke and blue fill from outer g. cloneNode(false) retains neither; a marker under root defs has no such ancestors. Exact effective display depends on marker style inheritance; requires actual DOM/browser regression, not supplied by this Python witness.','rootIDWitness':wrap('<g data-arrow="end"><line x1="10" y1="50" x2="100" y2="50"/><polygon points="100,50 92,47 92,53"/></g>').replace('<svg ','<svg id="engine-arrow-0" ',1)})
report={
 'sourceCommit':C,'sourceWorkingTreeReadOrExecuted':False,'scope':'Pinned SourceD seven arrow implementation changes plus supplied source regression reviewed against parent parser; no production changes',
 'counts':{'ownPinnedPythonSanitizerControls':len(controls),'sanitizerPass':sum(c['pass']for c in controls),'ownIndependentCoordinateRoundtrips':len(roundtrips),'actualJSDOMBrowser':0},
 'acceptableCore':'Explicit g end/both provenance avoids guessing arbitrary triangles. Engine diffs add wrappers while preserving shaft/head geometry, and dimension text stays outside. Marker userSpaceOnUse and local dot-product coordinates preserve forward tip offset and original sizes algebraically, unlike generic arrow-tool replacement.',
 'findings':[
  {'id':'AR-SYNC-1','status':'bounded compatibility HOLD','topic':'Parent inherited styling / coordinate-dependent clipping','evidence':'figureArrow clones polygon attributes only, moves it from original group ancestry to root defs, and does not resolve inherited fill/stroke/stroke-width or CSS selector effects. Source producer heads have explicit fill, so simple generated examples are not proof for all styled imports. A nested parent stroke changes polygon outline while marker relocation loses that ancestry. A head clip-path/mask in userSpaceOnUse also remains in original coordinate frame while polygon points become local.','minimalFix':'Restrict accepted groups/heads to known plain producer attributes or materialize safe effective inherited presentation on the marker polygon; reject unsupported coordinate-bound effects rather than silently converting. Add actual parent-style/clipping regressions.'},
  {'id':'AR-SYNC-2','status':'static concrete collision HOLD; DOM reproduction pending','topic':'Root ID omitted from generated-id reservation','evidence':'ids uses root.querySelectorAll([id]), which excludes root itself. svg id=engine-arrow-0 with no descendant ids permits a marker with the same ID. Fragment resolution is then ambiguous; do not claim an exploit or definite browser outcome without DOM test.','minimalFix':'Reserve root id along with all descendant ids before allocation.'},
 ],
 'contracts':{
  'wrongTagEnum':'Pinned Python sanitizer rejects data-arrow on wrong tags and enum outside end/both. TS normalizer processes g end/both only, but broad metadata regex itself permits arrow on other tags; these are inert until normalization, not engine semantic approval.',
  'nested':'Only direct children line plus exact1/2 polygons accepted; extra/nested geometry makes group skip. Inner eligible groups may still normalize independently. defs/assets/grids skipped. Parent mask/clipPath/marker/pattern ancestors are not all explicitly skipped by normalize; test preservation before broad imports.',
  'oldNumbers':'Head data-object-id/data-n deliberately stripped; line number remains, group unchanged. Existing head references/IDs/numbers can change object membership after reopening if saved annotated group arrives. No executed JS number/undo/reopen guarantee; preserve legacy unmarked shapes and test stable line number/root last-number.',
  'reopenBoth':'Once normalized marker polygon lives under defs and data-arrow removed, repeated normalize should not convert it again. Both mapping relies on producer order first polygon=start second=end; malformed swapped order is not validated against endpoints and must not be called geometry verification.',
  'externalRefs':'Pinned Python sanitizer continues rejecting external references, events and input markers. Parent sanitizes imported attrs/references before normalization. Generated marker URLs are local; this patch is not broader SVG security certification.',
  'parentIntegration':'Apply only arrow imports/metadata/function call to current richer parent prepare implementation; do not replace SourceD entire figureSvgEditing file over asset/grid/group safety. Existing parent source hashes captured stable, not current postmerge execution.'},
 'limits':'Static TypeScript review + pinned committed Python sanitizer and independent coordinate algebra only. No actual DOM/move/rotate/control/reopen/undo runtime or pixel equality executed. Exporter6test/Chromium zero-diff claims are exporter evidence only. No math/grade/rights/DB/public approval; no other equation editor/browser/IP work. Initial documentation root path was absent; actual committed docs/export path used.'}
dump('own-report.json',report);print(json.dumps({'controls':report['counts'],'reportSHA256':sha((P/'own-report.json').read_bytes())}))
