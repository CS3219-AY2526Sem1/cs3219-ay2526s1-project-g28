#!/usr/bin/env bash
set -euo pipefail
# Derive a short image tag from the commit SHA; override by passing an arg.
if [[ $# -ge 1 ]]; then
  echo "$1"
else
  echo "${GITHUB_SHA:-local}" | cut -c1-12
fi
