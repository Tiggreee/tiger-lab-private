#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/new-project.sh <project-name> <template>"
  exit 1
fi

NAME="$1"
TEMPLATE="$2"
SRC="templates/$TEMPLATE"
DEST="projects/$NAME"

if [[ ! -d "$SRC" ]]; then
  echo "Template not found: $TEMPLATE"
  exit 1
fi

if [[ -e "$DEST" ]]; then
  echo "Destination already exists: $DEST"
  exit 1
fi

mkdir -p projects
cp -R "$SRC" "$DEST"
echo "Project created at $DEST"
