import { describe, expect, it } from "vitest"
import { parseEffectWorkflow, printEffectWorkflow, type WorkflowIR } from "../src/editor/index.js"

describe("Effect workflow code round trip", () => {
  it("preserves workflow name and activities", () => {
    const workflow: WorkflowIR = {
      version: 1,
      name: "OrderWorkflow",
      body: {
        nodes: [
          { _tag: "Activity", id: "load-order", name: "Load order" },
          { _tag: "Activity", id: "send-email", name: "Send email" },
        ],
      },
    }

    expect(parseEffectWorkflow(printEffectWorkflow(workflow))).toEqual(workflow)
  })
})
