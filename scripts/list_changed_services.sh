#!/usr/bin/env bash
set -euo pipefail
# Lists service names whose directories changed in this push range.
BASE_SHA="${1:-}"
HEAD_SHA="${2:-}"
if [[ -z "$BASE_SHA" || -z "$HEAD_SHA" ]]; then
  echo "Usage: $0 <base_sha> <head_sha>" >&2
  exit 2
fi
git diff --name-only "$BASE_SHA" "$HEAD_SHA"   | grep '^services/' | cut -d'/' -f2 | sort -u
