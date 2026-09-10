# workflow-engine-ts

A small, durable workflow engine for TypeScript built on [Effect](https://effect.website/).

> Status: early MVP. The in-memory adapter is intended for development and tests. Durable production adapters are planned next.

## Goals

- Define workflows as ordinary typed Effect programs.
- Persist every completed step.
- Resume after a process restart without repeating completed steps.
- Make retries, timeouts, cancellation, and observability composable.
- Keep persistence behind an adapter.

## Install

```bash
pnpm add workflow-engine-ts effect
```

## Example

```ts
import { Effect } from "effect"
import {
  MemoryWorkflowStore,
  Workflow,
  WorkflowRuntime,
} from "workflow-engine-ts"

const ProcessOrder = Workflow.define({
  name: "ProcessOrder",
  version: 1,
  run: ({ orderId }: { readonly orderId: string }, workflow) =>
    Effect.gen(function* () {
      const payment = yield* workflow.step(
        { id: "charge-payment" },
        Effect.succeed({ paymentId: `payment-${orderId}` }),
      )

      return { paymentId: payment.paymentId }
    }),
})

const program = Effect.gen(function* () {
  const store = yield* MemoryWorkflowStore.make
  const runtime = WorkflowRuntime.make(store)

  return yield* runtime.run(ProcessOrder, {
    id: "order-123",
    input: { orderId: "123" },
  })
})

Effect.runPromise(program)
```

Calling `runtime.run` again with the same workflow ID replays persisted step results and continues at the first unfinished step.

## Delivery semantics

The engine provides at-least-once execution for unfinished steps. A completed step is not run again. External side effects must accept an idempotency key because a process can stop after the external operation succeeds but before its result is persisted.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design and roadmap.

## Development

```bash
pnpm install
pnpm check
pnpm test
```

## License

MIT
