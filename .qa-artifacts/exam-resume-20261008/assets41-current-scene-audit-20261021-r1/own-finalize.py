from pathlib import Path
import json,hashlib,re,math
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
j=json.loads((P/'own-results.json').read_text(encoding='utf8'));before=json.loads((P/'own-before.json').read_text(encoding='utf8'))
assert all(sha(Path(p).read_bytes())==h for p,h in before.items())
assert j['unique']==81 and j['passed']==81 and not j['failed']
inputs={r['id']:r['input']for r in json.loads((P/'own-inputs.json').read_text(encoding='utf8'))}
root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');anchors=json.loads((root/'scripts/figure/assets/anchors.json').read_text(encoding='utf8'))
def transform(text,xy):
 x,y=xy
 commands=re.findall(r'(translate|rotate|scale)\(([^)]*)\)',text)
 for op,values in reversed(commands):
  v=list(map(float,values.split()))
  if op=='translate':x+=v[0];y+=v[1]
  elif op=='scale':x*=v[0];y*=v[1]
  else:
   a=math.radians(v[0]);x,y=x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a)
 return [x,y]
serial=[]
for row in j['results']:
 if not row['id'].startswith('edge:'):continue
 item=inputs[row['id']];obs=row['observed'];a=anchors[item['asset']]
 b,t=transform(obs['serializedTransform'],a['edgeBase']),transform(obs['serializedTransform'],a['edgeTop'])
 serial.append({'id':row['id'],'serializedBase':b,'serializedTop':t,'baseErrorVersusUnroundedPlacement':math.dist(b,obs['baseMapped']),'topErrorVersusUnroundedPlacement':math.dist(t,obs['topMapped']),'topErrorVersusRequested':math.dist(t,item['to']),'uprightPolicy':not obs['exactAlignmentBeforeSerialization']})
(P/'own-serialized-transform-observations.json').write_text(json.dumps(serial,indent=2),encoding='utf8')
report={
 'status':'bounded current Root Python scene controls81/81 passed; no whole engine/UI/math/grade approval',
 'newAuditNotReuse':True,'actualRootHEAD':j['actualRootHEAD'],'unique':81,'passed':81,'failed':0,
 'cohorts':{'actual41LoaderSanitize':41,'edgeFrontFlipInclinedAndUpright':12,'shrinkAndAssetOnly':3,'malformedAssets':6,'solidAndUnknownSlug':6,'malformedItem':10,'degenerate':1,'actualNewPictureRender':2},
 'alignment':'Actual Root plan_assets for building/building-3d using independently read anchors edgeBase/edgeTop. Base mapping and non-upright top mapping agree within1e-9 arithmetic check. Shallow within12deg intentionally keeps artwork upright and matches height, not requested top x; do not call it exact2endpoint alignment.',
 'serializedTransform':'Own parser recomputed actual returned translate/rotate/scale string, with rounding errors retained in own-serialized-transform-observations.json. Unrounded plan assertions do not certify exact serialized alignment or pixel/ink binding.',
 'maximumSerializedEndpointErrorFromUnroundedPlan':max(max(x['baseErrorVersusUnroundedPlacement'],x['topErrorVersusUnroundedPlacement'])for x in serial),
 'shrink':'Observed current unmodified plan_assets via temporary pass-through function wrapper in QA process only; all calls delegate original. Free oversized at asset actually repeats with shrinking factor. Fixed oversize rejects without useless shrink calls. Empty points with asset-only is accepted. No Root code/file edits.',
 'failclosed':'Explicit null/empty/list corruption, malformed dimensions/coords/flip/anchor/extra fields/mixed branches, degenerate from/to, unknown/path/prototype slugs reject via actual render_json JSON error envelopes. can/dice/bowl remain excluded from mathematical picture-assets route.',
 'loader':'Actual currentRoot manifest/body loader plus currentRoot sanitizer41; currentRoot data directory, no QA data substitution in this scope. No sourceD execution.',
 'versionBoundary':'This tests current Root files after599 edge/shrink and Root null/empty-extent repairs, with exact raw before/after hashes. Prior599 data-on-oldRoot audit is preserved and is not this execution. SourceD finalcc export/current working export was not executed or treated as current Root authority. Parent13 tests/final7 exact counts not copied or independently rerun here.',
 'sourceHashesUnchanged':True,'boundFiles':len(before),'actualImportClosure':j['currentRootImports'],
 'limitations':['No Node/browser/renderer raster/visual readability inspection','No actual model/API/DB operations','No seven exact expected-output replay in this scope','No general arbitrary anchors/proxy/3D scene proof','Serialized transform rounding not silently treated as exact geometry','Artwork appearance cannot certify right angle/length/solid math','No new student problems/manual counts, grade/rights/native/public operational approval'],
 'approvals':{'math':False,'grade':False,'sourceIdentity':False,'rights':False,'nativeUI':False,'loadability':False},
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in P.iterdir()if f.is_file() and f.name!='own-report.json'}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'boundFiles':len(before),'serializedMaxError':report['maximumSerializedEndpointErrorFromUnroundedPlan']}))
