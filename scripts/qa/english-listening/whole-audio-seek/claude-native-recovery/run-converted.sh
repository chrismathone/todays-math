#!/usr/bin/env bash
# Listening rounds for the one converted original (ebs-middle-1-2006-2), on its
# own verified playback clock. Same stages and planner as run-rounds.sh, with
# --converted, recognized by run_converted_probes.py instead of the MPEG runner.
#
#   ./run-converted.sh <first round number> <stage> [<stage> ...]
#   ./run-converted.sh 40 headings context variants gaps variants terminal quotes+controls
#
# Round numbers, the stage record, a failing planner and a failing recognizer
# are handled as in run-rounds.sh (lib/rounds.sh).
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
STAGES="$OUT/logs/stages.jsonl"
# shellcheck source=lib/cleanup.sh
. "$HERE/lib/cleanup.sh"
# shellcheck source=lib/rounds.sh
. "$HERE/lib/rounds.sh"

# The tests stand in for the planner and the recognizer through the two
# NATIVE_RECOVERY_TEST_* variables; nothing else sets them.
plan() { # <out root> <stage name> <round id> [planner flags]
  if [ -n "${NATIVE_RECOVERY_TEST_PLANNER:-}" ]; then
    "$NATIVE_RECOVERY_TEST_PLANNER" "$@"
  else
    (cd "$HERE" && node plan.mjs --stage "$2" --round "$3" --scope reconstructed "${@:4}")
  fi
}

recognize() { # <out root> <round id>
  local status=0 log
  log="$OUT/logs/probes-$(basename "$1")-round-$2.log"
  if [ -n "${NATIVE_RECOVERY_TEST_RECOGNIZER:-}" ]; then
    "$NATIVE_RECOVERY_TEST_RECOGNIZER" "$1" "$2" >>"$log" 2>&1 || status=$?
  else
    PYTHONIOENCODING=utf-8 "$PYTHON" -u "$HERE/run_converted_probes.py" \
      --requests "$1/probe-requests/round-$2.json" --out "$1" \
      --lock "$SEEK/gpu-probe.lock" \
      --model-cache "$MAIN/output/listening-assessments/reconstruction/model-cache" \
      --owner "$OWNER" --main "$MAIN" \
      >>"$log" 2>&1 || status=$?
  fi
  cleanup_round "$1" "$2"
  return "$status"
}

for stage in "$@"; do
  flags=(--converted)
  case "$stage" in
    *+controls) flags+=(--controls) ;;
    *+tile) flags+=(--tile) ;;
  esac
  id="$(next_round "$OUT" "$round")"
  round=$((10#$id))
  status=0
  run_stage run-converted reconstructed "$stage" "$OUT" "$id" "${flags[@]}" || status=$?
  [ "$status" -eq 0 ] || exit "$status"
  round=$((round + STAGE_USED_ROUND))
done
echo "converted-rounds-complete next=$round" | tee -a "$OUT/logs/rounds.log"
