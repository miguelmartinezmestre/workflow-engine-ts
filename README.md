# Effect Workflow Studio

A bidirectional visual editor for the official Effect workflow primitives.

The project targets two audiences over the same workflow definition:

- non-technical users design workflows with `@xyflow/react`
- technical users review and edit the equivalent Effect TypeScript

The architecture is:

```text
@xyflow/react <-> WorkflowIR <-> Effect TypeScript
                              |
                              v
                   effect/unstable/workflow
```

## MVP

The current branch provides a deployable Cloudflare Workers application with:

- React + Vite frontend
- xyflow workflow canvas
- activity nodes and connections
- Canvas -> Effect source conversion
- Effect source -> Canvas conversion for the supported reversible subset
- stable node identifiers
- Workers KV persistence for saved workflow/source
- `/api/health`
- official `Workflow.make` definitions from `effect/unstable/workflow`

## Development

```bash
pnpm install
pnpm dev
```

Validation:

```bash
pnpm check
pnpm test
pnpm build
```

## Cloudflare

See [CLOUDFLARE.md](./CLOUDFLARE.md).

After creating the `WORKFLOWS` KV namespace and putting its id in `wrangler.jsonc`:

```bash
pnpm deploy
```

## Scope of bidirectional editing

The editor intentionally uses a reversible subset of TypeScript. Generated activities carry stable `@workflow-node` metadata. Unsupported arbitrary TypeScript must not be silently converted or discarded; support for conditions, parallel branches, waits and child workflows will be added as explicit IR constructs.

## Legacy prototype

The repository still contains the original custom durable-workflow prototype while migration to Effect's official workflow runtime is underway. New editor/runtime integration should target `effect/unstable/workflow` rather than extending that legacy runtime.

## License

MIT
