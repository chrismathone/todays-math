#!/usr/bin/env bash
# Listening rounds for the one converted original (ebs-middle-1-2006-2), on its
# own verified playback clock. Same stages and planner as run-rounds.sh, with
# --converted, recognized by run_converted_probes.py instead of the MPEG runner.
#
#   ./run-converted.sh <first round number> <stage> [<stage> ...]
#   ./run-converted.sh 40 headings context variants gaps variants terminal quotes+controls
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MAIN="C:/Creative/testautocreator"
SEEK="$MAIN/output/listening-assessments/whole-audio-seek-20261005"
OUT="${NATIVE_RECOVERY_OUT:-$MAIN/output/listening-assessments/whole-audio-seek-20261006/native-recovery/claude}"
OWNER="${NATIVE_RECOVERY_OWNER:-claude:native-recovery:converted}"
PYTHON="$SEEK/claude/asr-venv/Scripts/python.exe"

round="$1"
shift
mkdir -p "$OUT/logs"
# shellcheck source=lib/cleanup.sh
. "$HERE/lib/cleanup.sh"

for stage in "$@"; do
  flags=(--converted)
  name="${stage%%+*}"
  case "$stage" in
    *+controls) flags+=(--controls) ;;
    *+tile) flags+=(--tile) ;;
  esac
  # A round id that already has a request is never reused.
  while [ -e "$OUT/probe-requests/round-$(printf '%03d' "$round").json" ]; do
    round=$((round + 1))
  done
  id="$(printf '%03d' "$round")"
  planned="$(cd "$HERE" && node plan.mjs --stage "$name" --round "$id" --scope reconstructed "${flags[@]}")"
  echo "$planned" | tee -a "$OUT/logs/rounds.log"
  if echo "$planned" | grep -q '"probes":0'; then
    continue
  fi
  PYTHONIOENCODING=utf-8 "$PYTHON" -u "$HERE/run_converted_probes.py" \
    --requests "$OUT/probe-requests/round-$id.json" --out "$OUT" \
    --lock "$SEEK/gpu-probe.lock" \
    --model-cache "$MAIN/output/listening-assessments/reconstruction/model-cache" \
    --owner "$OWNER" --main "$MAIN" \
    >>"$OUT/logs/probes-claude-round-$id.log" 2>&1
  cleanup_round "$OUT" "$id"
  tail -n 1 "$OUT/logs/probes-claude-round-$id.log" | tee -a "$OUT/logs/rounds.log"
  round=$((round + 1))
done
echo "converted-rounds-complete next=$round" | tee -a "$OUT/logs/rounds.log"
