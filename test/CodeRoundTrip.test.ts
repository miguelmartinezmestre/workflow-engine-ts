import { describe, expect, it } from "vitest"
import { parseEffectWorkflow, printEffectWorkflow, type WorkflowIR } from "../src/editor/index.js"

describe("Effect workflow code round trip", () => {
  it("preserves a nested visual workflow", () => {
    const workflow: WorkflowIR = { version: 2, name: "OrderWorkflow", body: { nodes: [
      { _tag: "Activity", id: "load-order", name: "Load order" },
      { _tag: "Condition", id: "check", condition: { _tag: "Binary", operator: ">", left: { _tag: "Reference", path: ["input","total"] }, right: { _tag: "Literal", value: 1000 } }, then: { nodes: [{ _tag: "Wait", id: "wait", name: "Wait", mode: "duration", durationSeconds: 30 }] }, else: { nodes: [] } },
    ] } }
    expect(parseEffectWorkflow(printEffectWorkflow(workflow))).toEqual(workflow)
  })
})
