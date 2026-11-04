#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
export PATH="$PWD/.runtime/node/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Bitte im selben Ordner zuerst Setup.command ausführen."
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' || [ ! -f node_modules/.package-lock.json ]; then
  echo "Bitte im selben Ordner zuerst Setup.command ausführen."
  exit 1
fi
exec node --env-file-if-exists=.env scripts/share.mjs
