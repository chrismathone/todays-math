"""Read-only, bounded-memory random access to the derived local SVG cache.
No database/dependency. The census writes one JSON [sha256,SVG] record per line.
"""
from pathlib import Path
import json,hashlib,threading
class AssetStore:
 def __init__(self,out):
  self.path=Path(out)/'assets.ndjson';self.index={};self.local=threading.local()
  with self.path.open('rb') as f:
   offset=0
   while line:=f.readline():
    if not line.startswith(b'["') or line[66:69]!=b'","':raise ValueError('Malformed derived asset cache; rerun census')
    key=line[2:66].decode('ascii')
    if key in self.index:raise ValueError('Duplicate derived asset hash')
    self.index[key]=(offset,len(line));offset+=len(line)
 def __len__(self):return len(self.index)
 def __contains__(self,key):return key in self.index
 def __getitem__(self,key):
  offset,length=self.index[key]
  if not hasattr(self.local,'file'):self.local.file=self.path.open('rb')
  f=self.local.file;f.seek(offset);stored,svg=json.loads(f.read(length))
  if stored!=key or hashlib.sha256(svg.encode()).hexdigest()!=key:raise ValueError('Derived SVG hash mismatch')
  return svg
 def get(self,key,default=None):return self[key] if key in self.index else default
 def items(self):
  with self.path.open('rb') as f:
   for line in f:
    key,svg=json.loads(line)
    if hashlib.sha256(svg.encode()).hexdigest()!=key:raise ValueError('Derived SVG hash mismatch')
    yield key,svg
