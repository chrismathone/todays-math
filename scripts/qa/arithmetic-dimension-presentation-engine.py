"""Offline batch bridge to the actual vendored dimension renderer; no port."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "vendor" / "figure-engine"))
from core.figure_svg import meas  # noqa: E402

requests = json.load(sys.stdin)
json.dump([meas(*row) for row in requests], sys.stdout, ensure_ascii=True)
