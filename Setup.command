#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [ "$(uname -s)" != Darwin ]; then
  echo "Dieser Installer ist für macOS. Unter Linux Node.js 24 und Ollama bereitstellen."
  exit 1
fi
case "$(uname -m)" in arm64) arch=arm64;; x86_64) arch=x64;; *) echo "Nicht unterstützte Architektur."; exit 1;; esac
mkdir -p .runtime/downloads .local/models
node_version=24.22.1
if ! [ -x .runtime/node/bin/node ]; then
  archive="node-v${node_version}-darwin-${arch}.tar.gz"
  echo "Lade Node.js ${node_version} ausschließlich in den Projektordner …"
  curl -fL --retry 2 "https://nodejs.org/dist/v${node_version}/SHASUMS256.txt" -o .runtime/downloads/node-shasums.txt
  curl -fL --retry 2 "https://nodejs.org/dist/v${node_version}/${archive}" -o ".runtime/downloads/${archive}"
  (cd .runtime/downloads; awk -v filename="$archive" '$2 == filename {print}' node-shasums.txt > node-checksum.txt; test -s node-checksum.txt; shasum -a 256 -c node-checksum.txt)
  mkdir -p .runtime/node
  tar -xzf ".runtime/downloads/${archive}" --strip-components=1 -C .runtime/node
fi
if ! [ -x .runtime/ollama/ollama ]; then
  echo "Lade Ollama 0.40.14 ausschließlich in den Projektordner …"
  curl -fL --retry 2 https://github.com/ollama/ollama/releases/download/v0.40.14/ollama-darwin.tgz -o .runtime/downloads/ollama-darwin.tgz
  (cd .runtime/downloads; printf '%s  %s\n' f3bf9a528e908da0da5a2b3a4ad3252a369d62186501dc4880261e8d9023bff5 ollama-darwin.tgz | shasum -a 256 -c -)
  mkdir -p .runtime/ollama
  tar -xzf .runtime/downloads/ollama-darwin.tgz -C .runtime/ollama
fi
export PATH="$PWD/.runtime/node/bin:$PATH"
echo "Installiere die gepinnten App-Abhängigkeiten …"
npm ci --no-audit --no-fund
npm run package
export OLLAMA_MODELS="$PWD/.local/models"
export OLLAMA_NO_CLOUD=1
owned_ollama_pid=''
cleanup() { if [ -n "$owned_ollama_pid" ]; then kill "$owned_ollama_pid" 2>/dev/null || true; wait "$owned_ollama_pid" 2>/dev/null || true; fi; }
trap cleanup EXIT
if ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  OLLAMA_HOST=127.0.0.1:11434 .runtime/ollama/ollama serve > .local/ollama.log 2>&1 &
  owned_ollama_pid=$!
  for attempt in {1..30}; do
    if curl -fsS --max-time 1 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then break; fi
    if ! kill -0 "$owned_ollama_pid" 2>/dev/null; then echo "Ollama konnte nicht starten. Siehe .local/ollama.log"; exit 1; fi
    sleep 1
  done
fi
echo "Lade das lokale Sprachmodell. Dafür werden mehrere GB Speicher benötigt."
.runtime/ollama/ollama pull "${EXITAI_MODEL:-qwen2.5:3b}"
echo "Einrichtung abgeschlossen. Jetzt Start.command öffnen. Es wurde keine Systemsoftware ersetzt."
