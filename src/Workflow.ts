import { Effect } from "effect"
import type { StepOptions, WorkflowId } from "./model.js"
import type { WorkflowStore, WorkflowStoreError } from "./WorkflowStore.js"

export interface WorkflowContext {
  readonly id: WorkflowId

  readonly step: <Value, Error, Requirements>(
    options: StepOptions,
    effect: Effect.Effect<Value, Error, Requirements>,
  ) => Effect.Effect<Value, Error | WorkflowStoreError, Requirements>
}

export interface WorkflowDefinition<
  Input,
  Output,
  Error,
  Requirements,
> {
  readonly name: string
  readonly version: number
  readonly run: (
    input: Input,
    context: WorkflowContext,
  ) => Effect.Effect<Output, Error | WorkflowStoreError, Requirements>
}

export interface WorkflowOptions<Input, Output, Error, Requirements> {
  readonly name: string
  readonly version: number
  readonly run: (
    input: Input,
    context: WorkflowContext,
  ) => Effect.Effect<Output, Error | WorkflowStoreError, Requirements>
}

export const Workflow = {
  define: <Input, Output, Error, Requirements>(
    options: WorkflowOptions<Input, Output, Error, Requirements>,
  ): WorkflowDefinition<Input, Output, Error, Requirements> => options,
}

export const makeWorkflowContext = (
  runId: WorkflowId,
  store: WorkflowStore,
): WorkflowContext => ({
  id: runId,
  step: <Value, Error, Requirements>(
    options: StepOptions,
    effect: Effect.Effect<Value, Error, Requirements>,
  ) =>
    Effect.gen(function* () {
      const persisted = yield* store.getStep<Value>(runId, options.id)

      if (persisted !== undefined) {
        return persisted.value
      }

      const value = yield* effect

      yield* store.saveStep({
        runId,
        stepId: options.id,
        value,
        completedAt: new Date(),
      })

      return value
    }),
})
