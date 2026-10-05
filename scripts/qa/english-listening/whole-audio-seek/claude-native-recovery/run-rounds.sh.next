#!/usr/bin/env bash
# Plans and runs listening rounds in order. Every round is planned from what
# the earlier rounds actually heard, then recognized by the existing bounded
# runner (../claude/run_probes.py) under the shared exclusive GPU lock.
#
#   ./run-rounds.sh <scope> <first round number> <stage> [<stage> ...]
#   ./run-rounds.sh pilot 2 headings variants terminal quotes+controls truncation
#
# Stages: headings | context | variants | terminal | gaps | quotes |
#         quotes+controls | quotes+tile | truncation (adversarial, own folder,
#         own numbering).
# A stage that plans nothing is skipped and does not use a round number.
# A round number that already has a request, raw containers or a temporary
# folder is never used again: the stage takes the next free one (lib/rounds.sh).
# Every stage leaves one line in logs/stages.jsonl; a planner or a recognizer
# that fails stops the driver with its exit status, after that line is written.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MAIN="C:/Creative/testautocreator"
SEEK="$MAIN/output/listening-assessments/whole-audio-seek-20261005"
OUT="${NATIVE_RECOVERY_OUT:-$MAIN/output/listening-assessments/whole-audio-seek-20261006/native-recovery/claude}"
OWNER="${NATIVE_RECOVERY_OWNER:-claude:native-recovery}"
PYTHON="$SEEK/claude/asr-venv/Scripts/python.exe"

scope="$1"
round="$2"
shift 2
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
    (cd "$HERE" && node plan.mjs --stage "$2" --round "$3" --scope "$scope" "${@:4}")
  fi
}

recognize() { # <out root> <round id>
  local status=0 log
  log="$OUT/logs/probes-$(basename "$1")-round-$2.log"
  if [ -n "${NATIVE_RECOVERY_TEST_RECOGNIZER:-}" ]; then
    "$NATIVE_RECOVERY_TEST_RECOGNIZER" "$1" "$2" >>"$log" 2>&1 || status=$?
  else
    PYTHONIOENCODING=utf-8 "$PYTHON" -u "$HERE/../claude/run_probes.py" \
      --requests "$1/probe-requests/round-$2.json" --out "$1" \
      --lock "$SEEK/gpu-probe.lock" \
      --model-cache "$MAIN/output/listening-assessments/reconstruction/model-cache" \
      --owner "$OWNER" --runtime-root "$SEEK/decoder-runtime" \
      >>"$log" 2>&1 || status=$?
  fi
  # The runner deletes each source's temporary clips; remove this round's own
  # folder if that left it empty. Never sweep tmp: another round may be extracting.
  cleanup_round "$1" "$2"
  return "$status"
}

for stage in "$@"; do
  flags=()
  name="${stage%%+*}"
  case "$stage" in
    *+controls) flags+=(--controls) ;;
    *+tile) flags+=(--tile) ;;
  esac
  if [ "$name" = "truncation" ]; then
    root="$OUT/adversarial"
    id="$(next_round "$root" "$(($(ls "$root/probe-requests" 2>/dev/null | wc -l) + 1))")"
  else
    root="$OUT"
    id="$(next_round "$root" "$round")"
    round=$((10#$id))
  fi
  status=0
  run_stage run-rounds "$scope" "$stage" "$root" "$id" "${flags[@]}" || status=$?
  [ "$status" -eq 0 ] || exit "$status"
  [ "$name" = "truncation" ] || round=$((round + STAGE_USED_ROUND))
done
echo "rounds-complete next=$round" | tee -a "$OUT/logs/rounds.log"
