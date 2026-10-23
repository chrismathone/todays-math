"""Public Vercel function with application HMAC; not a private service binding."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import base64
import gzip
import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import threading
import time

ROOT=Path(__file__).resolve().parents[1]
MAX_BODY=3_500_000
MAX_RESPONSE=4_000_000
MAX_OUTPUT=8*1024*1024
MAX_AGE=60
PROTOCOL="ontology-engine-v1"
_nonces={}
_nonce_lock=threading.Lock()
_workers=threading.BoundedSemaphore(1)

def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False)
def digest(text):return "sha256:"+hashlib.sha256(text.encode("utf-8")).hexdigest()
def signature(secret,timestamp,body):
    key=hmac.new(secret.encode(),b"ontology-engine-key-v1",hashlib.sha256).digest()
    return hmac.new(key,(PROTOCOL+"\n"+timestamp+"\n").encode()+body,hashlib.sha256).hexdigest()

def limits():
    import resource
    resource.setrlimit(resource.RLIMIT_CPU,(180,181))
    # AS is enforced on Linux production; macOS RSS/AS enforcement is not assumed.
    if sys.platform.startswith("linux"):resource.setrlimit(resource.RLIMIT_AS,(1536*1024*1024,1536*1024*1024))

def compile_child(value):
    child=subprocess.Popen([sys.executable,"-B",str(ROOT/"scripts/ontology/compiler/compiler.py")],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,cwd=ROOT,preexec_fn=limits if os.name=="posix" else None)
    overflow=threading.Event();chunks=[]
    def write():
        try:child.stdin.write(canonical(value).encode())
        except (BrokenPipeError,OSError):pass
        finally:child.stdin.close()
    def read():
        size=0
        while True:
            part=child.stdout.read(65536)
            if not part:break
            size+=len(part)
            if size>MAX_OUTPUT:overflow.set();child.kill();break
            chunks.append(part)
    writer=threading.Thread(target=write,daemon=True);reader=threading.Thread(target=read,daemon=True)
    writer.start();reader.start()
    try:
        code=child.wait(timeout=230);reader.join(timeout=2)
        if code or overflow.is_set() or reader.is_alive():raise ValueError("COMPILER_FAILED")
        return b"".join(chunks)
    finally:
        if child.poll() is None:child.kill()
        child.wait();writer.join(timeout=2);reader.join(timeout=2);child.stdout.close()

class handler(BaseHTTPRequestHandler):
    def log_message(self,*_):pass
    def reply(self,status,value):
        data=canonical(value).encode()
        if len(data)>MAX_RESPONSE:status,data=413,b'{"error":"RESPONSE_BUDGET"}'
        self.send_response(status);self.send_header("Content-Type","application/json; charset=utf-8");self.send_header("Cache-Control","no-store");self.send_header("Content-Length",str(len(data)));self.send_header("Connection","close");self.end_headers();self.close_connection=True
        try:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
    def do_GET(self):self.reply(405,{"error":"POST_ONLY"})
    def do_POST(self):
        if self.path!="/api/ontology-engine":return self.reply(404,{"error":"NOT_FOUND"})
        secret=os.environ.get("MATH_ONTOLOGY_ENGINE_SECRET") or os.environ.get("ONTOLOGY_ENGINE_SECRET") or os.environ.get("STUDIO_ENGINE_SECRET") or os.environ.get("AUTH_SECRET")
        audience=os.environ.get("ONTOLOGY_ENGINE_AUDIENCE") or os.environ.get("VERCEL_URL")
        if not secret or not audience:return self.reply(503,{"error":"ENGINE_NOT_CONFIGURED"})
        lengths=self.headers.get_all("Content-Length",[])
        if len(lengths)!=1 or not re.fullmatch(r"[0-9]{1,10}",lengths[0]) or self.headers.get("Transfer-Encoding") or self.headers.get("Content-Encoding","identity")!="identity":return self.reply(400,{"error":"BODY_FRAMING"})
        if not 0<int(lengths[0])<=MAX_BODY:return self.reply(413,{"error":"REQUEST_BUDGET"})
        stamp=self.headers.get("x-ontology-timestamp","");mac=self.headers.get("x-ontology-signature","")
        if not re.fullmatch(r"[0-9]{10,11}",stamp) or not re.fullmatch(r"[a-f0-9]{64}",mac) or abs(time.time()-int(stamp))>MAX_AGE:return self.reply(401,{"error":"UNAUTHORIZED"})
        try:
            connection=getattr(self,"connection",None)
            if hasattr(connection,"settimeout"):connection.settimeout(10)
            body=self.rfile.read(int(lengths[0]))
            if len(body)!=int(lengths[0]) or not hmac.compare_digest(mac,signature(secret,stamp,body)):return self.reply(401,{"error":"UNAUTHORIZED"})
            request=json.loads(body)
            required={"protocol","operation","audience","jobId","inputHash","leaseGeneration","expiresAt","leaseExpiresAt","nonce","input"}
            if set(request)!=required or request["protocol"]!=PROTOCOL or request["operation"]!="compile" or request["audience"]!=audience:return self.reply(401,{"error":"UNAUTHORIZED"})
            if not re.fullmatch(r"[a-zA-Z0-9_-]{1,160}",request["jobId"]) or type(request["leaseGeneration"]) is not int or request["leaseGeneration"]<1 or type(request["expiresAt"]) is not int or not time.time()<request["expiresAt"]<=int(stamp)+MAX_AGE:return self.reply(401,{"error":"STALE_JOB"})
            if type(request["leaseExpiresAt"]) is not int or not time.time()<request["leaseExpiresAt"]<=int(stamp)+600 or request["expiresAt"]>request["leaseExpiresAt"]:return self.reply(401,{"error":"STALE_LEASE"})
            if not re.fullmatch(r"[a-f0-9]{32}",request["nonce"]) or digest(canonical(request["input"]))!=request["inputHash"]:return self.reply(401,{"error":"UNBOUND_INPUT"})
            with _nonce_lock:
                for k,v in list(_nonces.items()):
                    if v<time.time():_nonces.pop(k,None)
                if request["nonce"] in _nonces:return self.reply(409,{"error":"REPLAY"})
                if len(_nonces)>=512:return self.reply(429,{"error":"BUSY"})
                _nonces[request["nonce"]]=request["expiresAt"]
            if not _workers.acquire(blocking=False):return self.reply(429,{"error":"BUSY"})
            try:result=compile_child(request["input"])
            finally:_workers.release()
            if time.time()>=request["leaseExpiresAt"]:return self.reply(409,{"error":"EXPIRED_LEASE"})
            packed=base64.b64encode(gzip.compress(result,mtime=0)).decode()
            self.reply(200,{"resultGzip":packed,"resultHash":"sha256:"+hashlib.sha256(result).hexdigest(),"jobId":request["jobId"],"leaseGeneration":request["leaseGeneration"],"inputHash":request["inputHash"]})
        except subprocess.TimeoutExpired:self.reply(504,{"error":"COMPILER_TIMEOUT"})
        except Exception:self.reply(422,{"error":"COMPILER_FAILED"})

if __name__=="__main__":
    server=ThreadingHTTPServer(("127.0.0.1",int(sys.argv[1]) if len(sys.argv)>1 else 0),handler)
    print(canonical({"host":"127.0.0.1","port":server.server_port}),flush=True)
    try:server.serve_forever()
    finally:server.server_close()
