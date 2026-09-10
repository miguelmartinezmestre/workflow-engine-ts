# Cloudflare deployment

The application is a React + `@xyflow/react` SPA and a Cloudflare Worker API in one Vite project.

## One-time setup

```bash
pnpm install
pnpm exec wrangler login
pnpm exec wrangler kv namespace create WORKFLOWS
```

Copy the namespace id returned by Wrangler into `wrangler.jsonc` as the `WORKFLOWS` namespace `id`.

## Local development

```bash
pnpm dev
```

## Verification

```bash
pnpm check
pnpm test
pnpm build
```

## Deploy

```bash
pnpm deploy
```

The Worker handles `/api/*`. Cloudflare Static Assets serves the React application and uses SPA fallback for client-side navigation.

## Current MVP

- visual workflow canvas with `@xyflow/react`
- add and connect activity nodes
- Canvas -> Effect TypeScript synchronization
- Effect TypeScript -> Canvas synchronization for the generated activity subset
- stable workflow node ids embedded as source metadata
- save workflow definition and source to Workers KV
- health endpoint at `/api/health`
- official Effect `Workflow.make` output

The visual source converter deliberately supports a constrained reversible subset. Arbitrary TypeScript is not silently rewritten.
