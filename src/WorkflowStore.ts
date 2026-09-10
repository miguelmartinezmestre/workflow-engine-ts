import type { Effect } from "effect"
import type { StepId, StepRecord, WorkflowId, WorkflowRunRecord } from "./model.js"

export class WorkflowStoreError extends Error {
  readonly _tag = "WorkflowStoreError"

  constructor(
    message: string,
    override readonly cause?: Error,
  ) {
    super(message)
    this.name = "WorkflowStoreError"
  }
}

export interface WorkflowStore {
  readonly getRun: <Input, Output>(
    runId: WorkflowId,
  ) => Effect.Effect<WorkflowRunRecord<Input, Output> | undefined, WorkflowStoreError>

  readonly saveRun: <Input, Output>(
    run: WorkflowRunRecord<Input, Output>,
  ) => Effect.Effect<void, WorkflowStoreError>

  readonly getStep: <Value>(
    runId: WorkflowId,
    stepId: StepId,
  ) => Effect.Effect<StepRecord<Value> | undefined, WorkflowStoreError>

  readonly saveStep: <Value>(
    step: StepRecord<Value>,
  ) => Effect.Effect<void, WorkflowStoreError>
}
