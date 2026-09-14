"""JSON stdin/stdout adapter for the ported Mathgen native HWPX writer."""
import json
import sys
from writer import build_parts

try:
    payload = json.load(sys.stdin)
    print(json.dumps(build_parts(payload), ensure_ascii=False))
except (ValueError, TypeError, KeyError) as error:
    print(json.dumps({"error": str(error)[:250]}, ensure_ascii=False))
    sys.exit(1)
