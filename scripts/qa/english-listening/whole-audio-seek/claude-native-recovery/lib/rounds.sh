# Round ids and the stage record. Sourced by the drivers; never run on its own.
#
# A round id is three digits, 001..999. An id is free only when nothing of that
# round exists under the root: no request, no folder of raw containers and no
# temporary folder. A request that was written and never finished, or a raw
# folder whose request is gone, is left exactly as it is and its id is not
# given out again.

# next_round <out root> <first candidate>
#   Prints the first free id from the candidate upward. Fails (2) when the
#   candidate is not a round number, (3) when no id is free.
next_round() {
  local root="$1" from="${2:-}" n id
  case "$from" in
    '' | *[!0-9]*)
      echo "next_round: not a round number: '$from'" >&2
      return 2
      ;;
  esac
  if [ "${#from}" -gt 3 ]; then
    echo "next_round: round number outside 001..999: '$from'" >&2
    return 2
  fi
  n=$((10#$from))
  if [ "$n" -lt 1 ]; then
    echo "next_round: round number outside 001..999: '$from'" >&2
    return 2
  fi
  while [ "$n" -le 999 ]; do
    id="$(printf '%03d' "$n")"
    if [ ! -e "$root/probe-requests/round-$id.json" ] &&
      [ ! -e "$root/probes/round-$id" ] &&
      [ ! -e "$root/tmp/round-$id" ]; then
      printf '%s\n' "$id"
      return 0
    fi
    n=$((n + 1))
  done
  echo "next_round: no free round id from '$from' under $root" >&2
  return 3
}

# record_stage <log file> <driver> <scope> <stage> <round id or -> <root>
#              <planned probes or -> <runner exit or -> [<planned sources or ->] [<planner exit or ->]
#   One line per stage, appended. A stage that planned nothing has round "-"
#   and runner exit "-": it used no round id and ran no recognizer. A planner
#   that failed is recorded with its exit status and whatever it had counted.
record_stage() {
  local round="null" exit="null" probes="null" sources="null" planner="null"
  [ "$5" = "-" ] || round="\"$5\""
  [ "$7" = "-" ] || probes="$7"
  [ "$8" = "-" ] || exit="$8"
  [ "${9:--}" = "-" ] || sources="$9"
  [ "${10:--}" = "-" ] || planner="${10}"
  printf '{"at":"%s","driver":"%s","scope":"%s","stage":"%s","round":%s,"root":"%s","plannedSources":%s,"plannedProbes":%s,"plannerExit":%s,"runnerExit":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$2" "$3" "$4" "$round" "$6" "$sources" "$probes" "$planner" "$exit" >>"$1"
}

# planned_count <planner output line> <probes|sources>
#   The number the planner reported under that name, or fails when it reported none.
planned_count() {
  local n
  n="$(printf '%s' "$1" | sed -n 's/.*"'"$2"'":\([0-9][0-9]*\).*/\1/p' | head -n 1)"
  if [ -z "$n" ]; then
    echo "planned_count: the planner reported no $2 count" >&2
    return 2
  fi
  printf '%s\n' "$n"
}
planned_probes() { planned_count "$1" probes; }
planned_sources() { planned_count "$1" sources; }

# run_stage <driver> <scope> <stage> <out root> <round id> [planner flags]
#   One stage from plan to record, for a driver that defines plan and recognize
#   and has STAGES and OUT set. Sets STAGE_USED_ROUND to 1 when the round id was
#   used, 0 when the stage planned nothing. Returns 0, or the status of the
#   planner or the recognizer after writing the stage's record: a planner that
#   fails before it writes its request leaves a record too.
run_stage() {
  local driver="$1" scope="$2" stage="$3" root="$4" id="$5"
  shift 5
  local planned planner=0 probes="-" sources="-" round="-" status=0
  STAGE_USED_ROUND=0
  planned="$(plan "$root" "${stage%%+*}" "$id" "$@")" || planner=$?
  [ -z "$planned" ] || echo "$planned" | tee -a "$OUT/logs/rounds.log"
  if [ "$planner" -eq 0 ]; then
    probes="$(planned_probes "$planned")" || { planner=2; probes="-"; }
    sources="$(planned_sources "$planned")" || { planner=2; sources="-"; }
  fi
  # Whatever the planner said, a request it wrote is a round that was used.
  if [ -e "$root/probe-requests/round-$id.json" ]; then
    round="$id"
    STAGE_USED_ROUND=1
  fi
  if [ "$planner" -ne 0 ]; then
    record_stage "$STAGES" "$driver" "$scope" "$stage" "$round" "$root" "$probes" - "$sources" "$planner"
    echo "stage-failed driver=$driver scope=$scope stage=$stage round=$round planner-exit=$planner" |
      tee -a "$OUT/logs/rounds.log"
    return "$planner"
  fi
  if [ "$probes" -eq 0 ]; then
    record_stage "$STAGES" "$driver" "$scope" "$stage" - "$root" 0 - "$sources" 0
    return 0
  fi
  recognize "$root" "$id" || status=$?
  record_stage "$STAGES" "$driver" "$scope" "$stage" "$id" "$root" "$probes" "$status" "$sources" 0
  if [ "$status" -ne 0 ]; then
    echo "stage-failed driver=$driver scope=$scope stage=$stage round=$id exit=$status" |
      tee -a "$OUT/logs/rounds.log"
    return "$status"
  fi
  tail -n 1 "$OUT/logs/probes-$(basename "$root")-round-$id.log" | tee -a "$OUT/logs/rounds.log"
}
