"""Private Vercel /api function for the existing, dependency-free Python engines.

Node authenticates the user and validates their request before signing this body.
The MAC binds protocol, timestamp, operation and payload; no browser token or URL
is accepted here. Run this file directly for a loopback-only integration server.
"""
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

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 3_500_000
MAX_RESPONSE = 4_000_000
MAX_AGE_SECONDS = 60
ENGINES = {
    "figure": (ROOT / "scripts/figure/render_spec.py", 15, 1024 * 1024),
    "hwpx": (ROOT / "scripts/hwpx/export_parts.py", 30, 48 * 1024 * 1024),
}


class EngineLimit(Exception):
    pass


def run_engine(operation, payload):
    script, timeout, limit = ENGINES[operation]
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if operation == "figure" and len(raw) > 64 * 1024:
        raise EngineLimit()
    # Fixed executable and script; stdout is bounded while the process runs.
    # A process boundary retains render_spec's exact validation/sanitization and
    # lets us stop CPU-bound XML/geometry work, including on a Python exception.
    child = subprocess.Popen(
        [sys.executable, "-B", str(script)], cwd=str(ROOT),
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONDONTWRITEBYTECODE": "1",
             "FIGURE_ENGINE_PATH": str(ROOT / "vendor/figure-engine")},
    )
    chunks = []
    overflow = threading.Event()

    def write_input():
        try:
            child.stdin.write(raw)
        except (BrokenPipeError, OSError):
            pass
        finally:
            child.stdin.close()

    def read_output():
        size = 0
        while True:
            chunk = child.stdout.read(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                overflow.set()
                child.kill()
                break
            chunks.append(chunk)

    writer = threading.Thread(target=write_input, daemon=True)
    reader = threading.Thread(target=read_output, daemon=True)
    writer.start()
    reader.start()
    try:
        code = child.wait(timeout=timeout)
        reader.join(timeout=1)
        if overflow.is_set():
            raise EngineLimit()
        if reader.is_alive() or code != 0:
            raise ValueError("Engine failed")
        return b"".join(chunks)
    finally:
        if child.poll() is None:
            child.kill()
        child.wait()
        writer.join(timeout=1)
        reader.join(timeout=1)
        child.stdout.close()


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Do not log signed headers, document content, or paths.

    def reply(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(data) > MAX_RESPONSE:
            status, data = 413, b'{"error":"Engine response too large"}'
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        self.reply(405, {"error": "POST only"})

    def do_POST(self):
        if self.path != "/api/mathgen-engine":
            return self.reply(404, {"error": "Not found"})
        secret = os.environ.get("STUDIO_ENGINE_SECRET") or os.environ.get("AUTH_SECRET")
        if not secret:
            return self.reply(503, {"error": "Engine authentication is not configured"})
        timestamp = self.headers.get("x-mathgen-timestamp", "")
        signature = self.headers.get("x-mathgen-signature", "")
        if (not re.fullmatch(r"[0-9]{10,11}", timestamp)
                or not re.fullmatch(r"[a-f0-9]{64}", signature)
                or abs(time.time() - int(timestamp)) > MAX_AGE_SECONDS):
            return self.reply(401, {"error": "Unauthorized"})
        lengths = self.headers.get_all("Content-Length", [])
        if (len(lengths) != 1 or not re.fullmatch(r"[0-9]{1,10}", lengths[0])
                or self.headers.get("Transfer-Encoding")
                or self.headers.get("Content-Encoding", "identity") != "identity"):
            return self.reply(400, {"error": "Invalid body framing"})
        size = int(lengths[0])
        if not 0 < size <= MAX_BODY:
            return self.reply(413, {"error": "Engine request too large"})
        try:
            # A local HTTP server owns a socket; platform adapters may provide an
            # already-buffered request without a socket interface.
            connection = getattr(self, "connection", None)
            if hasattr(connection, "settimeout"):
                connection.settimeout(10)
            body = self.rfile.read(size)
            if len(body) != size:
                return self.reply(400, {"error": "Incomplete body"})
            expected = hmac.new(secret.encode("utf-8"),
                                b"mathgen-engine-v1\n" + timestamp.encode("ascii") + b"\n" + body,
                                hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, signature):
                return self.reply(401, {"error": "Unauthorized"})
            # Also expire bodies that took too long to arrive.
            if abs(time.time() - int(timestamp)) > MAX_AGE_SECONDS:
                return self.reply(401, {"error": "Unauthorized"})
            envelope = json.loads(body)
            if (not isinstance(envelope, dict) or set(envelope) != {"operation", "payload"}
                    or not isinstance(envelope["operation"], str)
                    or envelope["operation"] not in ENGINES
                    or not isinstance(envelope["payload"], dict)):
                return self.reply(422, {"error": "Invalid engine request"})
            result = run_engine(envelope["operation"], envelope["payload"])
            packed = base64.b64encode(gzip.compress(result, compresslevel=6)).decode("ascii")
            return self.reply(200, {"resultGzip": packed})
        except EngineLimit:
            return self.reply(413, {"error": "Engine result too large"})
        except (subprocess.TimeoutExpired, TimeoutError):
            return self.reply(504, {"error": "Engine timed out"})
        except (ValueError, TypeError, KeyError, RecursionError):
            return self.reply(422, {"error": "Invalid engine request"})
        except Exception:
            return self.reply(500, {"error": "Engine failed"})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    print(f"http://127.0.0.1:{server.server_port}", flush=True)
    server.serve_forever()
