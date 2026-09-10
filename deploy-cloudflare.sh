#!/usr/bin/env bash
set -Eeuo pipefail

REPO_BRANCH="${REPO_BRANCH:-feat/effect-workflow-editor-foundation}"
WRANGLER_CONFIG="${WRANGLER_CONFIG:-wrangler.jsonc}"
KV_BINDING="${KV_BINDING:-WORKFLOWS}"
WORKER_NAME="${WORKER_NAME:-workflow-engine-ts}"
MIN_NODE_MAJOR="${MIN_NODE_MAJOR:-22}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33mWARN: %s\033[0m\n' "$*" >&2; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

trap 'die "Falló el comando en línea $LINENO: $BASH_COMMAND"' ERR

command -v git >/dev/null || die "git no está instalado"
command -v node >/dev/null || die "Node.js no está instalado"

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= MIN_NODE_MAJOR )) || die "Necesitas Node.js >= ${MIN_NODE_MAJOR}; detectado $(node -v)"

if ! command -v pnpm >/dev/null; then
  log "pnpm no encontrado; intentando activarlo con Corepack"
  command -v corepack >/dev/null || die "Instala pnpm o Corepack"
  corepack enable || true
  corepack prepare pnpm@11.19.0 --activate
fi

[[ -f package.json ]] || die "Ejecuta este script desde la raíz de workflow-engine-ts"
[[ -f "$WRANGLER_CONFIG" ]] || die "No encuentro $WRANGLER_CONFIG"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURRENT_BRANCH="$(git branch --show-current)"
  if [[ "$CURRENT_BRANCH" != "$REPO_BRANCH" ]]; then
    warn "Estás en '$CURRENT_BRANCH'; esperaba '$REPO_BRANCH'. Continuaré sin cambiar de rama automáticamente."
  fi
fi

log "Instalando dependencias"
pnpm install

log "Comprobando TypeScript"
pnpm check

log "Ejecutando tests"
pnpm test

log "Compilando aplicación"
pnpm build

log "Validando Wrangler"
pnpm exec wrangler --version

if ! pnpm exec wrangler whoami >/dev/null 2>&1; then
  log "Cloudflare requiere autenticación"
  printf 'Wrangler mostrará una URL. Ábrela desde tu iPhone y completa el login.\n'
  pnpm exec wrangler login
fi

log "Cloudflare autenticado"
pnpm exec wrangler whoami

KV_ID="$(node - <<'NODE'
const fs = require('fs')
const text = fs.readFileSync(process.env.WRANGLER_CONFIG || 'wrangler.jsonc', 'utf8')
const m = text.match(/"binding"\s*:\s*"WORKFLOWS"[\s\S]*?"id"\s*:\s*"([a-f0-9]{32})"/i)
if (m) process.stdout.write(m[1])
NODE
)"

if [[ -z "$KV_ID" ]]; then
  log "Buscando namespace KV existente"
  KV_LIST="$(pnpm exec wrangler kv namespace list 2>/dev/null || true)"

  KV_ID="$(KV_LIST="$KV_LIST" WORKER_NAME="$WORKER_NAME" KV_BINDING="$KV_BINDING" node - <<'NODE'
const raw = process.env.KV_LIST || ''
const expected = `${process.env.WORKER_NAME}-${process.env.KV_BINDING}`
const start = raw.indexOf('[')
const end = raw.lastIndexOf(']')
if (start === -1 || end === -1) process.exit(0)
try {
  const rows = JSON.parse(raw.slice(start, end + 1))
  const hit = rows.find((x) => x?.title === expected || x?.title === process.env.KV_BINDING)
  if (hit?.id) process.stdout.write(hit.id)
} catch {}
NODE
)"
fi

if [[ -z "$KV_ID" ]]; then
  log "Creando namespace KV $KV_BINDING"
  CREATE_OUTPUT="$(pnpm exec wrangler kv namespace create "$KV_BINDING" 2>&1 | tee /dev/stderr)"
  KV_ID="$(CREATE_OUTPUT="$CREATE_OUTPUT" node - <<'NODE'
const s = process.env.CREATE_OUTPUT || ''
const m = s.match(/\b[a-f0-9]{32}\b/i)
if (m) process.stdout.write(m[0])
NODE
)"
  [[ -n "$KV_ID" ]] || die "No pude extraer el ID del KV creado"
fi

log "Configurando binding KV: $KV_ID"
WRANGLER_CONFIG="$WRANGLER_CONFIG" KV_ID="$KV_ID" node - <<'NODE'
const fs = require('fs')
const file = process.env.WRANGLER_CONFIG
const id = process.env.KV_ID
let text = fs.readFileSync(file, 'utf8')
if (/REPLACE_WITH_KV_NAMESPACE_ID/.test(text)) {
  text = text.replace(/REPLACE_WITH_KV_NAMESPACE_ID/g, id)
} else if (!text.includes(id)) {
  text = text.replace(/("binding"\s*:\s*"WORKFLOWS"[\s\S]*?"id"\s*:\s*")[^"]+("\s*)/, `$1${id}$2`)
}
fs.writeFileSync(file, text)
NODE

log "Dry-run del deploy"
pnpm exec wrangler deploy --dry-run --outdir .wrangler-dist

log "Desplegando a Cloudflare Workers"
pnpm deploy

log "Deploy terminado"
printf 'Comprueba la URL que Wrangler mostró y prueba /api/health.\n'
