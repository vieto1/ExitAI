#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
export PATH="$PWD/.runtime/node/bin:$PWD/.runtime/ollama:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Bitte zuerst Setup.command öffnen oder Node.js 24 oder neuer installieren."
  read -r -p "Zum Schließen die Eingabetaste drücken. "
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo "Diese App benötigt Node.js 24 oder neuer."
  exit 1
fi
echo "ExitAI wird gestartet. Die lokale Adresse erscheint unten. Mit Ctrl+C beenden."
mkdir -p .local/models
owned_ollama_pid=''
app_pid=''
cleanup() {
  if [ -n "$app_pid" ]; then kill "$app_pid" 2>/dev/null || true; wait "$app_pid" 2>/dev/null || true; fi
  if [ -n "$owned_ollama_pid" ]; then kill "$owned_ollama_pid" 2>/dev/null || true; wait "$owned_ollama_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if command -v ollama >/dev/null 2>&1 && ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 OLLAMA_MODELS="$PWD/.local/models" ollama serve > .local/ollama.log 2>&1 &
  owned_ollama_pid=$!
fi
node --env-file-if-exists=.env server.mjs &
app_pid=$!
wait "$app_pid"
