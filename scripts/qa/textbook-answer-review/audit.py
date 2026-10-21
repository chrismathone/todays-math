"""Read-only local evidence audit. No runner, reveal, DB or approval operation."""
import argparse
import json
from pathlib import Path

from review_core import audit_bundle, verify_packet, verify_records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["preparation", "execution"])
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    if args.kind == "execution":
        result = audit_bundle(json.loads(args.path.read_text()), repo)
    else:
        index = json.loads((args.path / "evidence-index.json").read_text())
        errors = verify_records(index["artifacts"]) + verify_records([index["freeze"]])
        errors += verify_records(index["tools"]) + verify_records(index["assets"])
        freeze = json.loads(Path(index["freeze"]["path"]).read_text())
        errors += verify_records(freeze["files"])
        manifests = json.loads((args.path / "packet-manifests.json").read_text())
        for packet in manifests:
            errors.extend({"id": packet["id"], "error": e} for e in verify_packet(Path(packet["folder"]), packet["manifest"], repo))
        result = {"errors": errors, "packetsChecked": len(manifests), "executionAuthorized": False, "modelCalls": 0}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result.get("errors") or result.get("bundleErrors"): raise SystemExit(1)


if __name__ == "__main__":
    main()
