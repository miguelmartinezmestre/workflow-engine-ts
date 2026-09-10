import { describe, expect, it } from "vitest"
import { Schema } from "effect"
import { WorkflowIR, makeEffectWorkflow } from "../src/editor/index.js"

describe("workflow editor foundation", () => {
  it("creates an empty semantic workflow representation", () => {
    expect(WorkflowIR.empty("OrderWorkflow")).toEqual({ version: 2, name: "OrderWorkflow", body: { nodes: [] } })
  })

  it("uses the official Effect Workflow runtime definition", () => {
    const workflow = makeEffectWorkflow("OrderWorkflow", { payload: { orderId: Schema.String }, success: Schema.String, error: Schema.String, idempotencyKey: ({ orderId }) => orderId })
    expect(workflow._tag).toBe("OrderWorkflow")
    expect(workflow.payloadSchema).toBeDefined()
    expect(workflow.successSchema).toBeDefined()
  })
})
