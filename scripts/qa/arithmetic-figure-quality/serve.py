from asset_store import AssetStore
"""Local read-only gallery and isolated browser evidence sink (no app/DB access)."""
import gzip,json,http.server,urllib.parse,threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/planning/tracks/reports/arithmetic-figure-quality-20261112'
manifest=json.loads(gzip.decompress((OUT/'manifest.json.gz').read_bytes()));assets=AssetStore(OUT)
unique={r['display']:r for r in reversed(manifest['rows']) if r.get('display')};rows=list(unique.values())
sourceRows=list({r['canonical']:{**r,'display':r['canonical'],'screen':r['sourceScreen'],'print':r['sourcePrint']} for r in reversed(manifest['rows']) if r.get('canonical')}.values())
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  u=urllib.parse.urlparse(self.path);q=urllib.parse.parse_qs(u.query)
  if u.path=='/data':data={'summary':manifest['summary'],'families':manifest['families'],'rows':manifest['rows']}
  elif u.path=='/canonical-batch':data=[{**r,'svg':assets[r['display']]} for r in sourceRows[int(q.get('offset',[0])[0]):int(q.get('offset',[0])[0])+int(q.get('count',[200])[0])]]
  elif u.path=='/unobserved':
   seen={}
   for line in (OUT/'browser-observations.jsonl').read_text().splitlines():
    for r in json.loads(line):seen[r['hash'],r['media']]=r
   data=[{k:r[k] for k in ('id','display','screen','print')} for r in rows if any((r['display'],media) not in seen for media in ('screen','print'))]
  elif u.path=='/by-hash':
   requested=q.get('hashes',[''])[0].split(',')
   if len(requested)>200:self.send_error(400);return
   data=[{**unique[h],'svg':assets[h]} for h in requested if h in unique]
  elif u.path=='/flagged':
   flags=json.loads(Path('/tmp/arithmetic-figure-quality/browser-flags.json').read_text());ids={r['hash'] for r in flags}
   data=[{**r,'svg':assets[r['display']]} for r in rows if r['display'] in ids]
  elif u.path=='/batch':data=[{**r,'svg':assets[r['display']]} for r in rows[int(q.get('offset',[0])[0]):int(q.get('offset',[0])[0])+int(q.get('count',[50])[0])]]
  elif u.path.startswith('/asset/'):
   svg=assets.get(u.path.split('/')[-1]);self.send_response(200 if svg else 404);self.send_header('Content-Type','image/svg+xml');self.end_headers();self.wfile.write((svg or '').encode());return
  else:return super().do_GET()
  body=json.dumps(data,ensure_ascii=False).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body)
 def do_POST(self):
  if self.path!='/results':self.send_error(404);return
  body=self.rfile.read(int(self.headers['Content-Length']));obj=json.loads(body)
  with (OUT/'browser-observations.jsonl').open('a') as f:f.write(json.dumps(obj)+'\n')
  self.send_response(200);self.end_headers();self.wfile.write(b'ok')
print(f'Gallery http://127.0.0.1:3197/docs/planning/tracks/reports/arithmetic-figure-quality-20261112/gallery.html; {len(rows)} unique displays',flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1',3197),Handler).serve_forever()
