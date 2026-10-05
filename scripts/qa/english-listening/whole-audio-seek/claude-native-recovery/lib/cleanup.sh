# Sourced by run-rounds.sh and run-converted.sh.
#
# cleanup_round <output root> <round id>
#
# Removes THIS round's own temporary folder, and only when its runner left it
# empty. Nothing else under <output root>/tmp is looked at: another round's
# runner creates an empty folder for a source several seconds before it writes
# the first clip into it, and a sweep of "every empty folder" once removed such
# a folder from under a live extraction.
cleanup_round() {
  local root own
  root="$(cd "$1" 2>/dev/null && pwd -P)" || return 0
  own="$root/tmp/round-$2"
  case "$2" in
    '' | *[!0-9A-Za-z_-]*) return 0 ;;
  esac
  # rmdir removes an empty directory only; a folder that still holds a
  # source's clips (a failed round) is left for whoever resumes it.
  [ -d "$own" ] && rmdir "$own" 2>/dev/null
  return 0
}
