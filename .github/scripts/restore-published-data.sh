#!/usr/bin/env bash
# Baixa os JSONs que estão publicados no GitHub Pages para <pasta>.
#
# Reserva para quando o cache do Actions não tem o estado da última coleta (o
# primeiro run, ou um cache despejado). O Pages serve os arquivos atrás de CDN,
# então o parâmetro ?t= pede uma cópia fresca. history.json e
# technical-notes.json são obrigatórios: sem eles a coleta recomeçaria o
# histórico do zero e publicaria isso por cima do site, então o script falha.
#
# Uso: restore-published-data.sh <pasta> [url-base]
#   url-base padrão: https://<dono>.github.io/<repo>/ (de GITHUB_REPOSITORY)
set -euo pipefail

dest="$1"
base="${2:-https://${GITHUB_REPOSITORY%%/*}.github.io/${GITHUB_REPOSITORY#*/}/}"
stamp="$(date +%s)"
mkdir -p "$dest"

fetch() {
  curl --fail --silent --show-error --max-time 60 -o "$dest/$1" "${base}data/$1?t=${stamp}"
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$dest/$1"
}

for f in history.json technical-notes.json; do
  fetch "$f"
  echo "restaurado: $f"
done

for f in notifier-state.json status.json summary.json; do
  if fetch "$f" 2>/dev/null; then
    echo "restaurado: $f"
  else
    echo "ausente no site (segue sem ele): $f"
  fi
done
