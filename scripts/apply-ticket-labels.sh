#!/usr/bin/env bash
set -u

print_usage() {
  cat <<'EOF'
Usage: ./scripts/apply-ticket-labels.sh [options]

Options:
  --repo REPO                    GitHub repo (owner/name)
  --ticket-number N              Ticket/issue number
  --type TYPE                    Ticket type: quiz|research|prototype|task
  --configured-labels LABELS     Comma-separated configured labels
  --inherited-labels LABELS      Comma-separated inherited labels
  --user-override LABELS         If set, use ONLY these labels (replace all)
  --verbose                      Verbose output
  --dry-run                      Show what would be applied, don't apply
  --help                         Show this help text

Returns: 0 on success, 1 on failure

Notes:
  - If --user-override is provided, it replaces the entire computed label set.
  - Otherwise, the final label set is the sorted union of configured labels,
    inherited labels, and recon:<type>.
  - Requires GitHub CLI (gh) with issue read/edit access.
EOF
}

log_info() {
  if [ "$VERBOSE" -eq 1 ]; then
    echo "$*"
  fi
}

log_error() {
  echo "Error: $*" >&2
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

normalize_csv_to_lines() {
  local input="${1-}"
  if [ -z "$input" ]; then
    return 0
  fi

  printf '%s' "$input" |
    tr ',' '\n' |
    while IFS= read -r raw; do
      local trimmed
      trimmed="$(trim "$raw")"
      if [ -n "$trimmed" ]; then
        printf '%s\n' "$trimmed"
      fi
    done
}

compute_final_labels() {
  local override="${1-}"
  local configured="${2-}"
  local inherited="${3-}"
  local ticket_type="${4-}"

  if [ -n "$override" ]; then
    normalize_csv_to_lines "$override" | LC_ALL=C sort -u
    return 0
  fi

  {
    normalize_csv_to_lines "$configured"
    normalize_csv_to_lines "$inherited"
    printf 'recon:%s\n' "$ticket_type"
  } | awk 'NF > 0' | LC_ALL=C sort -u
}

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    log_error "GitHub CLI 'gh' is required but was not found in PATH."
    return 1
  fi
}

validate_type() {
  case "$1" in
    quiz|research|prototype|task) return 0 ;;
    *)
      log_error "Invalid --type '$1'. Expected one of: quiz, research, prototype, task."
      return 1
      ;;
  esac
}

validate_required() {
  if [ -z "$REPO" ] || [ -z "$TICKET_NUMBER" ] || [ -z "$TYPE" ]; then
    log_error "Missing required parameters. --repo, --ticket-number, and --type are required."
    print_usage >&2
    return 1
  fi

  case "$TICKET_NUMBER" in
    ''|*[!0-9]*)
      log_error "--ticket-number must be a positive integer."
      return 1
      ;;
  esac
}

verify_ticket_exists() {
  log_info "Verifying issue #$TICKET_NUMBER exists in $REPO"
  if ! gh issue view "$TICKET_NUMBER" --repo "$REPO" >/dev/null 2>&1; then
    log_error "Unable to view issue #$TICKET_NUMBER in $REPO. Check the repo, ticket number, authentication, and gh permissions."
    return 1
  fi
}

apply_labels() {
  local labels_csv="$1"

  if [ -z "$labels_csv" ]; then
    echo "No labels to apply to issue #$TICKET_NUMBER in $REPO."
    return 0
  fi

  log_info "Applying labels: $labels_csv"
  if ! gh issue edit "$TICKET_NUMBER" --repo "$REPO" --add-label "$labels_csv" >/dev/null; then
    log_error "Failed to apply labels to issue #$TICKET_NUMBER in $REPO. gh issue edit returned an error."
    return 1
  fi

  echo "Applied labels to issue #$TICKET_NUMBER in $REPO: $labels_csv"
}

REPO=""
TICKET_NUMBER=""
TYPE=""
CONFIGURED_LABELS=""
INHERITED_LABELS=""
USER_OVERRIDE=""
VERBOSE=0
DRY_RUN=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      REPO="${2-}"
      shift 2
      ;;
    --ticket-number)
      TICKET_NUMBER="${2-}"
      shift 2
      ;;
    --type)
      TYPE="${2-}"
      shift 2
      ;;
    --configured-labels)
      CONFIGURED_LABELS="${2-}"
      shift 2
      ;;
    --inherited-labels)
      INHERITED_LABELS="${2-}"
      shift 2
      ;;
    --user-override)
      USER_OVERRIDE="${2-}"
      shift 2
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      print_usage >&2
      exit 1
      ;;
  esac
done

validate_required || exit 1
validate_type "$TYPE" || exit 1
require_gh || exit 1

mapfile -t FINAL_LABELS < <(compute_final_labels "$USER_OVERRIDE" "$CONFIGURED_LABELS" "$INHERITED_LABELS" "$TYPE")
LABELS_CSV=""
if [ "${#FINAL_LABELS[@]}" -gt 0 ]; then
  LABELS_CSV="$(printf '%s,' "${FINAL_LABELS[@]}")"
  LABELS_CSV="${LABELS_CSV%,}"
fi

if [ "$VERBOSE" -eq 1 ]; then
  if [ -n "$USER_OVERRIDE" ]; then
    log_info "Using user override labels only."
  else
    log_info "Computed additive label set from configured, inherited, and recon:$TYPE."
  fi
  log_info "Final labels: ${LABELS_CSV:-<none>}"
fi

verify_ticket_exists || exit 1

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run: would apply labels to issue #$TICKET_NUMBER in $REPO: ${LABELS_CSV:-<none>}"
  exit 0
fi

apply_labels "$LABELS_CSV" || exit 1
exit 0