"""Publish only hashes/counts/status, never private source or projected model text."""
import argparse
import json
from collections import Counter
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("external", type=Path)
    parser.add_argument("--public-output", type=Path, required=True)
    args = parser.parse_args()
    read = lambda name: json.loads((args.external / name).read_text(encoding="utf-8"))
    manifest = read("reference-manifest.json")
    converter = read("converter-evidence.json")
    conservation = read("source-conservation-tests.json")
    mutations = read("guard-mutations.json")
    exports = {}
    for variant in ["student", "answers"]:
        exported = read(f"new-u01-base-{variant}-export.json")
        checked = read(f"new-u01-base-{variant}-geometry.json")
        exports[variant] = {"pageCount": exported["pageCount"], "pdfSha256": exported["pdfSha256"],
                            "fixtureSha256": exported["fixtureSha256"], "chunks": exported["chunks"],
                            "pageMapCount": exported["pageMapCount"], "compatibilityChunkScoping": exported["compatibilityChunkScoping"],
                            "geometryStatus": checked["status"], "checked": checked["checked"],
                            "issueCounts": dict(Counter(x["code"] for x in checked["issues"]))}
    rows = manifest["originalFullmasterRows"]
    result = {"source": manifest["source"], "selectedPages": manifest["selectedPhysicalPages"],
              "originalKinds": len(manifest["kinds"]), "exerciseStages": len(manifest["exerciseStages"]),
              "converter": {"counts": converter["counts"], "exchangeHash": converter["exchangeHash"],
                            "baseHash": converter["baseHash"], "baseIntegrityErrors": converter["baseIntegrityErrors"],
                            "semanticSchemaAccepted": converter["semanticSchemaAccepted"]},
              "conservation": conservation, "mutations": {"passed": mutations["passed"], "tests": mutations["tests"],
                 "validControlPassed": any(x["expected"] is None and not x["codes"] for x in mutations["mutations"]),
                 "expectedFailuresObserved": sum(x["expected"] in x["codes"] for x in mutations["mutations"] if x["expected"])},
              "originalRowLabelDeltaMm": {"studyKeywords": max(abs(a["labelBoxMm"][1]-b["labelBoxMm"][1]) for a, b in zip(rows[:12], rows[12:24])),
                                          "studySentences": max(abs(a["labelBoxMm"][1]-b["labelBoxMm"][1]) for a, b in zip(rows[:12], rows[24:]))},
              "exports": exports, "g0aVisual": "pending semantic renderer integration and exact comparison",
              "answerFunctional": "original payloads and DTO allowlist passed; original answer visual equality not asserted",
              "humanVisualReview": "selected source/new PNGs only; no all-page human acceptance",
              "projectTypeCheck": "default 4GB heap exhausted; QA scoped 8GB type check passed"}
    args.public_output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": "QA evidence complete; G0a visual pending", "studentPages": exports["student"]["pageCount"],
                      "answerPages": exports["answers"]["pageCount"], "guardTests": mutations["tests"]}))


if __name__ == "__main__":
    main()
