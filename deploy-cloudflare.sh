#!/usr/bin/env bash
set -Eeuo pipefail

REPO_BRANCH="${REPO_BRANCH:-feat/effect-workflow-editor-foundation}"
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
[[ -f wrangler.jsonc ]] || die "No encuentro wrangler.jsonc"

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

WHOAMI="$(pnpm exec wrangler whoami 2>&1 || true)"
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && grep -qiE 'not authenticated|please run.*wrangler login|non-interactive' <<<"$WHOAMI"; then
  cat >&2 <<'EOF'

Cloudflare necesita autenticación para desplegar desde este VPS.

Crea un API Token desde tu cuenta de Cloudflare y, en esta sesión SSH, ejecuta:

  export CLOUDFLARE_API_TOKEN='TU_TOKEN'
  ./deploy-cloudflare.sh

No guardes el token en el repositorio ni lo pegues en este chat.
EOF
  exit 2
fi

log "Validando autenticación Cloudflare"
pnpm exec wrangler whoami

log "Dry-run del deploy"
pnpm exec wrangler deploy --dry-run --outdir .wrangler-dist

log "Desplegando a Cloudflare Workers"
pnpm deploy

log "Deploy terminado"
printf 'Abre la URL mostrada por Wrangler y prueba /api/health.\n'
