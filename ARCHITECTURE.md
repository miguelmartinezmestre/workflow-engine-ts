# Architecture

## Objective

`workflow-engine-ts` is a durable workflow library whose definitions remain normal Effect programs. The engine records completed step results and replays them when an execution resumes.

## Principles

1. Effect stays visible. Errors and requirements remain in `Effect<Success, Error, Requirements>`.
2. Step IDs are stable and unique within a workflow execution.
3. State is persisted before a completed step is exposed to subsequent steps.
4. Storage and scheduling are adapters, not global singletons.
5. The public API does not expose `effect/unstable/workflow`, allowing its use internally without coupling consumers to an experimental API.

## Runtime flow

1. Load or create the workflow run.
2. Execute the workflow definition from the beginning.
3. For each step, look up `(runId, stepId)`.
4. Return the stored value when the step completed previously.
5. Otherwise execute the Effect and persist its result.
6. Persist the final workflow result.

Re-executing the pure workflow definition is intentional: persisted step boundaries make replay inexpensive and prevent completed effects from running twice.

## Delivery guarantee

The engine guarantees at-least-once execution of unfinished steps, not exactly-once execution of arbitrary external effects.

There is an unavoidable failure window:

1. an external side effect succeeds;
2. the process stops;
3. the step result has not yet been persisted.

After recovery the step runs again. Integrations must therefore use the stable `idempotencyKey` passed by the workflow context. Future adapters may add transactional outbox support where the resource and workflow store share a database.

## Persistence contract

The core depends only on `WorkflowStore`. The initial `MemoryWorkflowStore` demonstrates the contract but does not survive process termination.

Planned production implementations:

- SQLite for a single-process durable worker.
- PostgreSQL with leases and row-level locking for distributed workers.

## Versioning

A run stores the workflow name and version. Changing control flow or step IDs requires incrementing the workflow version or providing an explicit migration. Old definitions must remain registered while executions of those versions can still resume.

## Roadmap

### MVP

- Typed workflow definitions.
- Persisted step results.
- Resume from the first unfinished step.
- In-memory adapter and recovery tests.

### Next

- Schema-based input, output, and step serialization.
- Retry policies using `Schedule`.
- Durable sleep and wake-up scheduling.
- SQLite adapter.
- Cancellation and structured tracing.

### Later

- PostgreSQL adapter and worker leases.
- Signals and durable deferred values.
- Child workflows and parallel durable steps.
- Sagas and compensating steps.
- CLI and monitoring UI.

## Effect integration

Effect 4 contains experimental workflow primitives under `effect/unstable/workflow`. The library may adopt those internally after the facade and persistence semantics stabilize. No unstable Effect type should become part of the public API.
