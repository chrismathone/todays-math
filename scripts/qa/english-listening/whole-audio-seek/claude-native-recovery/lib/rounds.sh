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

# record_stage <log file> <driver> <scope> <stage> <round id or -> <root> <planned probes> <runner exit or ->
#   One line per stage, appended. A stage that planned nothing has round "-"
#   and exit "-": it used no round id and ran no recognizer.
record_stage() {
  local round="null" exit="null"
  [ "$5" = "-" ] || round="\"$5\""
  [ "$8" = "-" ] || exit="$8"
  printf '{"at":"%s","driver":"%s","scope":"%s","stage":"%s","round":%s,"root":"%s","plannedProbes":%s,"runnerExit":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$2" "$3" "$4" "$round" "$6" "$7" "$exit" >>"$1"
}

# planned_probes <planner output line>
#   The number of probes the planner reported, or fails when it reported none.
planned_probes() {
  local n
  n="$(printf '%s' "$1" | sed -n 's/.*"probes":\([0-9][0-9]*\).*/\1/p' | head -n 1)"
  if [ -z "$n" ]; then
    echo "planned_probes: the planner reported no probe count" >&2
    return 2
  fi
  printf '%s\n' "$n"
}
