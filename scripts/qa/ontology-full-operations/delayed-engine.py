"""Isolated QA only: real Python HMAC/OWL/SHACL, then controlled 65s delay.
No external network or production credentials; parent owns loopback PID/port.
"""
import importlib.util
from http.server import ThreadingHTTPServer
from pathlib import Path
import sys
import time
root = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("ontology_qa_engine", root / "api/ontology-engine.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
compile_original = engine.compile_child
def delayed(value):
    result = compile_original(value)
    time.sleep(65)
    return result
engine.compile_child = delayed
server = ThreadingHTTPServer(("127.0.0.1", 0), engine.handler)
print(engine.canonical({"port": server.server_port}), flush=True)
try:
    server.serve_forever()
finally:
    server.server_close()
