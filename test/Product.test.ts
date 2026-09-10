import { describe, expect, it } from "vitest"
import { insertNode, validateWorkflow, WorkflowIR } from "../src/editor/index.js"

describe("visual workflow product", () => {
  it("edits nested condition branches immutably", () => {
    let workflow = WorkflowIR.empty("Orders")
    workflow = insertNode(workflow, [], 0, { _tag: "Condition", id: "condition", condition: { _tag: "Binary", operator: ">", left: { _tag: "Reference", path: ["input", "total"] }, right: { _tag: "Literal", value: 1000 } }, then: { nodes: [] }, else: { nodes: [] } })
    workflow = insertNode(workflow, ["condition", "then"], 0, { _tag: "Activity", id: "approve", name: "Approve" })
    const condition = workflow.body.nodes[0]
    expect(condition?._tag).toBe("Condition")
    if (condition?._tag === "Condition") expect(condition.then.nodes[0]?.id).toBe("approve")
  })

  it("reports publish blocking errors", () => {
    const workflow = insertNode(WorkflowIR.empty("Orders"), [], 0, { _tag: "Wait", id: "wait", name: "Wait", mode: "duration", durationSeconds: 0 })
    expect(validateWorkflow(workflow).some((issue) => issue.severity === "error")).toBe(true)
  })
})
