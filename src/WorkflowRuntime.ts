import { Effect } from "effect"
import type { WorkflowId, WorkflowRunRecord } from "./model.js"
import {
  makeWorkflowContext,
  type WorkflowDefinition,
} from "./Workflow.js"
import type { WorkflowStore, WorkflowStoreError } from "./WorkflowStore.js"

export interface RunOptions<Input> {
  readonly id: WorkflowId
  readonly input: Input
}

export interface WorkflowRuntime {
  readonly run: <Input, Output, Error, Requirements>(
    definition: WorkflowDefinition<Input, Output, Error, Requirements>,
    options: RunOptions<Input>,
  ) => Effect.Effect<Output, Error | WorkflowStoreError, Requirements>
}

export const WorkflowRuntime = {
  make: (store: WorkflowStore): WorkflowRuntime => ({
    run: <Input, Output, Error, Requirements>(
      definition: WorkflowDefinition<Input, Output, Error, Requirements>,
      options: RunOptions<Input>,
    ) =>
      Effect.gen(function* () {
        const existing = yield* store.getRun<Input, Output>(options.id)

        if (existing?.status === "completed") {
          return existing.output as Output
        }

        const running: WorkflowRunRecord<Input, Output> = {
          id: options.id,
          workflowName: definition.name,
          workflowVersion: definition.version,
          input: existing?.input ?? options.input,
          status: "running",
        }

        yield* store.saveRun(running)

        const output = yield* definition.run(
          running.input,
          makeWorkflowContext(options.id, store),
        )

        yield* store.saveRun({
          ...running,
          status: "completed",
          output,
        })

        return output
      }),
  }),
}
