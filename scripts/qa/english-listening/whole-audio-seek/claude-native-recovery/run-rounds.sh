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

recognize() { # <out root> <round id>
  PYTHONIOENCODING=utf-8 "$PYTHON" -u "$HERE/../claude/run_probes.py" \
    --requests "$1/probe-requests/round-$2.json" --out "$1" \
    --lock "$SEEK/gpu-probe.lock" \
    --model-cache "$MAIN/output/listening-assessments/reconstruction/model-cache" \
    --owner "$OWNER" --runtime-root "$SEEK/decoder-runtime" \
    >>"$OUT/logs/probes-$(basename "$1")-round-$2.log" 2>&1
  # The runner deletes each source's temporary clips; remove the empty folders too.
  find "$1/tmp" -type d -empty -delete 2>/dev/null || true
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
    id="$(printf '%03d' "$(( $(ls "$root/probe-requests" 2>/dev/null | wc -l) + 1 ))")"
  else
    root="$OUT"
    id="$(printf '%03d' "$round")"
  fi
  planned="$(cd "$HERE" && node plan.mjs --stage "$name" --round "$id" --scope "$scope" "${flags[@]}")"
  echo "$planned" | tee -a "$OUT/logs/rounds.log"
  if echo "$planned" | grep -q '"probes":0'; then
    continue
  fi
  recognize "$root" "$id"
  tail -n 1 "$OUT/logs/probes-$(basename "$root")-round-$id.log" | tee -a "$OUT/logs/rounds.log"
  [ "$name" = "truncation" ] || round=$((round + 1))
done
echo "rounds-complete next=$round" | tee -a "$OUT/logs/rounds.log"
