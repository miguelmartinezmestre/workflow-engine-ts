export type WorkflowId = string
export type StepId = string

export interface WorkflowRunRecord<Input, Output> {
  readonly id: WorkflowId
  readonly workflowName: string
  readonly workflowVersion: number
  readonly input: Input
  readonly status: "running" | "completed"
  readonly output?: Output
}

export interface StepRecord<Value> {
  readonly runId: WorkflowId
  readonly stepId: StepId
  readonly value: Value
  readonly completedAt: Date
}

export interface StepOptions {
  readonly id: StepId
  readonly idempotencyKey?: string
}
