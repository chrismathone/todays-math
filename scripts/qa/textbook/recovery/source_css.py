"""Public CSS dimensions/paint evidence for matching renderer authors; no Q/answers."""
import argparse
import hashlib
import json
import re
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--public-output", type=Path)
    args = parser.parse_args()
    result = {"source": {}, "rules": [], "method": "Original CSS declaration extraction, not computed/browser dimensions"}
    targets = re.compile(r"(font-face|(^|[ .,:>])sheet|content|head|foot|master|sentence-mask|mask|checkbar|rounds|opening|conversation|dialog|bubble|board|cover|paired|type-|work|qdiagram|question-grid|drill|basic|rule-box|grid-table|index-table|definition-figure|decimal-pair|map-|chapter|page-title|page-heading)")
    for name in ["styles.css", "editorial.css", "full.css", "chapters.css"]:
        contents = (args.source / name).read_text(encoding="utf-8")
        result["source"][name] = hashlib.sha256((args.source / name).read_bytes()).hexdigest()
        for match in re.finditer(r"([^{}]+)\{([^{}]*)\}", re.sub(r"/\*[\s\S]*?\*/", "", contents)):
            selector = match.group(1).strip()
            if targets.search(selector):
                result["rules"].append({"file": name, "selector": selector, "declarations": match.group(2).strip()})
    result["limits"] = ["CSS source values are not an optical PDF equality claim.",
                         "Source geometry must still be compared to all-page PDF/DOM landmarks within 0.5mm."]
    rendered = json.dumps(result, ensure_ascii=False, indent=2)+"\n"
    args.output.write_text(rendered, encoding="utf-8")
    if args.public_output:
        args.public_output.write_text(rendered, encoding="utf-8")
    print(json.dumps({"rules": len(result["rules"]), "files": len(result["source"])}))


if __name__ == "__main__":
    main()
