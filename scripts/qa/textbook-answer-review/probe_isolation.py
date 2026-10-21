"""Synthetic macOS file-isolation probe only; never launches a model or network.

This tests an explicit file-data/network deny /bin/cat profile, not a subscription CLI.
Do not widen it to run a model. Actual CLI/auth/network isolation needs a new
lead-reviewed profile and execution notice.
"""
import argparse
import json
import platform
import subprocess
import tempfile
from pathlib import Path

from review_core import digest, json_bytes, require_external


def probe(parent: Path):
    repo = Path(__file__).resolve().parents[3]
    require_external(parent, repo)
    if platform.system() != "Darwin" or not Path("/usr/bin/sandbox-exec").is_file():
        return {"status": "unavailable", "modelCalls": 0, "realCliIsolationVerified": False}
    with tempfile.TemporaryDirectory(prefix="synthetic-isolation-", dir=parent) as temp:
        root = Path(temp).resolve()
        allowed = root / "student.txt";allowed.write_text("SYNTHETIC_ALLOWED\n")
        secret = root / "answer-vault.txt";secret.write_text("SYNTHETIC_FORBIDDEN\n")
        alias = root / "student-link.txt";alias.symlink_to(secret)
        profile = '\n'.join([
            '(version 1)', '(allow default)', '(deny network*)',
            '(deny file-read-data)', '(deny file-write*)', '(deny process-exec)',
            '(allow process-exec (literal "/bin/cat"))',
            '(allow file-read-data (subpath "/System") (subpath "/usr/lib") (subpath "/usr/share") (subpath "/private/preboot/Cryptexes/OS") (subpath "/private/var/db/dyld") (literal "/dev/null") (literal "/dev/urandom") (literal "/bin/cat"))',
            '(allow file-map-executable (subpath "/System") (subpath "/usr/lib") (subpath "/private/preboot/Cryptexes/OS") (literal "/bin/cat"))',
            '(allow file-read-data (literal ' + json.dumps(str(allowed)) + '))',
        ])
        policy = root / "profile.sb";policy.write_text(profile)
        results = []
        for label, target, expect in [("allow_student", allowed, 0), ("deny_vault", secret, 1),
                                       ("deny_symlink", alias, 1), ("deny_repo", repo / "AGENTS.md", 1)]:
            argv = ["/usr/bin/sandbox-exec", "-f", str(policy), "/bin/cat", str(target)]
            result = subprocess.run(argv, capture_output=True, timeout=15, check=False)
            passed = (result.returncode == 0 and result.stdout == b"SYNTHETIC_ALLOWED\n") if expect == 0 else (
                result.returncode != 0 and result.stdout == b"" and b"Operation not permitted" in result.stderr)
            results.append({"case": label, "argv": argv, "exitCode": result.returncode,
                            "stdoutBytes": len(result.stdout), "stdoutSha256": digest(result.stdout),
                            "stderr": result.stderr.decode(errors="replace"), "passed": passed})
        return {"status": "passed" if all(r["passed"] for r in results) else "failed", "profile": profile,
                "profileSha256": digest(profile.encode()), "cases": results, "modelCalls": 0,
                "realCliIsolationVerified": False,
                "limitations": ["cat only", "no model transport", "no subscription authentication test",
                                "no CLI defaults, MCP, plugins, reviewer or image-reader exercise"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    require_external(args.out, Path(__file__).resolve().parents[3])
    result = probe(args.out.parent)
    with args.out.open("xb") as handle: handle.write(json_bytes(result))
    print(json.dumps({k: result[k] for k in ("status", "modelCalls", "realCliIsolationVerified")}))
    if result["status"] != "passed": raise SystemExit(1)


if __name__ == "__main__":
    main()
