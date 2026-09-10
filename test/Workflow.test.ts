import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { MemoryWorkflowStore, Workflow, WorkflowRuntime } from "../src/index.js"

describe("WorkflowRuntime", () => {
  it("does not repeat a completed step when a workflow resumes", async () => {
    const store = await Effect.runPromise(MemoryWorkflowStore.make)
    const runtime = WorkflowRuntime.make(store)
    let firstStepExecutions = 0
    let secondStepExecutions = 0

    const Example = Workflow.define({
      name: "RecoveryExample",
      version: 1,
      run: (_input: object, workflow) =>
        Effect.gen(function* () {
          const first = yield* workflow.step(
            { id: "first" },
            Effect.sync(() => {
              firstStepExecutions += 1
              return 1
            }),
          )

          const second = yield* workflow.step(
            { id: "second" },
            Effect.gen(function* () {
              secondStepExecutions += 1
              if (secondStepExecutions === 1) {
                return yield* Effect.fail(new Error("simulated process failure"))
              }
              return 2
            }),
          )

          return first + second
        }),
    })

    await expect(
      Effect.runPromise(runtime.run(Example, { id: "run-1", input: {} })),
    ).rejects.toThrow("simulated process failure")

    await expect(
      Effect.runPromise(runtime.run(Example, { id: "run-1", input: {} })),
    ).resolves.toBe(3)

    expect(firstStepExecutions).toBe(1)
    expect(secondStepExecutions).toBe(2)
  })
})
