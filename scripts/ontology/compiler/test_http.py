import base64
import gzip
import hashlib
import hmac
import http.client
import json
import pathlib
import secrets
import subprocess
import sys
import time
import unittest
from compiler import canonical,digest
from test_compiler import fixture

class HttpEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.process=subprocess.Popen([sys.executable,"-B","api/ontology-engine.py","0"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={"PATH":"/usr/bin:/bin","ONTOLOGY_ENGINE_SECRET":"synthetic-engine-test-secret","ONTOLOGY_ENGINE_AUDIENCE":"synthetic-deployment"},text=True)
        cls.address=json.loads(cls.process.stdout.readline());cls.port=cls.address["port"]
    @classmethod
    def tearDownClass(cls):
        cls.process.terminate();code=cls.process.wait(timeout=10)
        cls.process.stdout.close();cls.process.stderr.close()
        print(canonical({"ownedPid":cls.process.pid,"port":cls.port,"exitCode":code,"resourcesClosed":True}))
    def envelope(self):
        data=fixture();return dict(protocol="ontology-engine-v1",operation="compile",audience="synthetic-deployment",jobId="synthetic-job",inputHash=digest(canonical(data)),leaseGeneration=1,expiresAt=int(time.time())+55,nonce=secrets.token_hex(16),input=data)
    def call(self,value=None,sign=True,purpose="ontology-engine-v1",body_override=None,timestamp=None):
        body=canonical(value or self.envelope()).encode();stamp=str(timestamp or int(time.time()))
        key=hmac.new(b"synthetic-engine-test-secret",b"ontology-engine-key-v1",hashlib.sha256).digest()
        sig=hmac.new(key,(purpose+"\n"+stamp+"\n").encode()+body,hashlib.sha256).hexdigest()
        headers={"content-type":"application/json"}
        if sign:headers.update({"x-ontology-timestamp":stamp,"x-ontology-signature":sig})
        conn=http.client.HTTPConnection("127.0.0.1",self.port,timeout=10)
        try:
            conn.request("POST","/api/ontology-engine",body_override or body,headers);r=conn.getresponse();return r.status,json.loads(r.read())
        finally:conn.close()
    def test_actual_compile_http_and_result_integrity(self):
        status,r=self.call();self.assertEqual(status,200)
        raw=gzip.decompress(base64.b64decode(r['resultGzip']));self.assertEqual(r['resultHash'],"sha256:"+hashlib.sha256(raw).hexdigest())
        self.assertEqual(json.loads(raw)['identity']['profile'],'tm-owlrl-1')
    def test_unsigned_other_purpose_audience_expired_and_body_change(self):
        self.assertEqual(self.call(sign=False)[0],401)
        self.assertEqual(self.call(purpose="mathgen-engine-v1")[0],401)
        e=self.envelope();e['audience']='other';self.assertEqual(self.call(e)[0],401)
        e=self.envelope();e['expiresAt']=int(time.time())-1;self.assertEqual(self.call(e)[0],401)
        self.assertEqual(self.call(timestamp=int(time.time())-120)[0],401)
        self.assertEqual(self.call(body_override=b'{}')[0],401)
    def test_replay_within_worker_and_remote_import_are_rejected(self):
        e=self.envelope();self.assertEqual(self.call(e)[0],200);self.assertEqual(self.call(e)[0],409)
        e=self.envelope();e['input']['assertions'][0]['predicate']='http://www.w3.org/2002/07/owl#imports';e['inputHash']=digest(canonical(e['input']));self.assertEqual(self.call(e)[0],422)
    def test_content_encoding_bomb_is_not_decoded(self):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=10)
        try:
            c.request('POST','/api/ontology-engine',gzip.compress(b'x'*1000000),{'content-encoding':'gzip'});r=c.getresponse();self.assertEqual(r.status,400);r.read()
        finally:c.close()

if __name__=='__main__':unittest.main()
