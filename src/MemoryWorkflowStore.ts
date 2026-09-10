import { Effect } from "effect"
import type { StepRecord, WorkflowRunRecord } from "./model.js"
import type { WorkflowStore } from "./WorkflowStore.js"

export class MemoryWorkflowStore implements WorkflowStore {
  private readonly runs = new Map<string, WorkflowRunRecord<object, object>>()
  private readonly steps = new Map<string, StepRecord<object>>()

  static readonly make = Effect.sync(() => new MemoryWorkflowStore())

  getRun<Input, Output>(runId: string) {
    return Effect.sync(
      () => this.runs.get(runId) as WorkflowRunRecord<Input, Output> | undefined,
    )
  }

  saveRun<Input, Output>(run: WorkflowRunRecord<Input, Output>) {
    return Effect.sync(() => {
      this.runs.set(run.id, run as WorkflowRunRecord<object, object>)
    })
  }

  getStep<Value>(runId: string, stepId: string) {
    return Effect.sync(
      () => this.steps.get(`${runId}:${stepId}`) as StepRecord<Value> | undefined,
    )
  }

  saveStep<Value>(step: StepRecord<Value>) {
    return Effect.sync(() => {
      this.steps.set(
        `${step.runId}:${step.stepId}`,
        step as StepRecord<object>,
      )
    })
  }
}
