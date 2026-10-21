"""Kill selected safety-guard mutations with synthetic tests in external temp dirs."""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from review_core import json_bytes, require_external


MUTATIONS = [
    ("fraction_suffix", 'm = re.fullmatch(r"\\\\(?:d?frac)', 'm = re.match(r"\\\\(?:d?frac)', "test_exact_numeric_full_input_boundary"),
    ("raw_parsed", 'if reparsed != parsed:', 'if False:', "test_raw_parsed_conflict_and_actual_model_unknown"),
    ("turn_failed", 'elif kind == "turn.failed": errors.append("failed_turn")', 'elif kind == "turn.failed": pass', "test_tool_start_and_failed_turn_are_not_success"),
    ("tool_started", 'if kind == "item.started": starts.add(ident)', 'if False: starts.add(ident)', "test_tool_start_and_failed_turn_are_not_success"),
    ("extra_file", 'if {p.name for p in children} != {"student.json"}:', 'if False:', "test_manifest_rejects_extra_symlink_tamper_and_inside_repo"),
    ("ancestry", 'if any(run("merge-base", "--is-ancestor", a, b).returncode for a, b in [(freeze, seal), (seal, "HEAD")]):', 'if False:', "test_seal_requires_actual_git_ancestry_and_bytes"),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    require_external(args.out, here.parents[2])
    original = (here / "review_core.py").read_text()
    results = []
    for name, old, new, test in MUTATIONS:
        if original.count(old) != 1: raise ValueError("mutation location changed: " + name)
        with tempfile.TemporaryDirectory(dir=args.out.parent, prefix="synthetic-mutation-") as tmp:
            root = Path(tmp)
            (root / "review_core.py").write_text(original.replace(old, new))
            shutil.copyfile(here / "test_review.py", root / "test_review.py")
            argv = [sys.executable, "-B", "-m", "unittest", "test_review.ReviewTests." + test]
            run = subprocess.run(argv, cwd=root, capture_output=True, timeout=30, check=False)
            log = (run.stdout + run.stderr).decode(errors="replace")
            killed = run.returncode != 0 and "FAIL:" in log and "Ran 1 test" in log
            results.append({"mutation": name, "test": test, "argv": argv,
                            "exitCode": run.returncode, "killed": killed, "log": log})
    with args.out.open("xb") as handle:
        handle.write(json_bytes({"mutations": results, "modelCalls": 0, "allKilled": all(r["killed"] for r in results)}))
    print(json.dumps({"killed": sum(r["killed"] for r in results), "total": len(results)}))
    if not all(r["killed"] for r in results): raise SystemExit(1)


if __name__ == "__main__":
    main()
