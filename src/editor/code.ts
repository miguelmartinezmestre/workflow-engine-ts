import type { Expression, WorkflowBlock, WorkflowIR, WorkflowNode } from "./ir.js"

const safeIdentifier = (value: string): string => {
  const normalized = value.replace(/[^a-zA-Z0-9_$]/g, "_")
  return /^[a-zA-Z_$]/.test(normalized) ? normalized : `_${normalized}`
}

const expressionToSource = (expression: Expression): string => {
  if (expression._tag === "Literal") return JSON.stringify(expression.value)
  if (expression._tag === "Reference") return expression.path.join(".")
  return `${expressionToSource(expression.left)} ${expression.operator} ${expressionToSource(expression.right)}`
}

const indent = (value: string, spaces: number): string => value.split("\n").map((line) => `${" ".repeat(spaces)}${line}`).join("\n")

const reviewMeta = (node: WorkflowNode): string => `// @workflow-node ${node.id} ${node._tag}`

const blockSource = (block: WorkflowBlock, depth = 6): string =>
  block.nodes.map((node) => indent(nodeSource(node), depth)).join("\n\n") || `${" ".repeat(depth)}yield* Effect.void`

const nodeSource = (node: WorkflowNode): string => {
  const meta = reviewMeta(node)
  switch (node._tag) {
    case "Activity":
      return `${meta}\nyield* Effect.log(${JSON.stringify(`Activity: ${node.name}`)})`
    case "Condition":
      return `${meta}\nif (${expressionToSource(node.condition)}) {\n${blockSource(node.then, 2)}\n} else {\n${blockSource(node.else, 2)}\n}`
    case "Wait":
      return node.mode === "duration"
        ? `${meta}\nyield* Effect.sleep(${JSON.stringify(`${node.durationSeconds ?? 0} seconds`)})`
        : `${meta}\nyield* Effect.log(${JSON.stringify(`Wait for event: ${node.eventName ?? ""}`)})`
    case "Approval":
      return `${meta}\nyield* Effect.log(${JSON.stringify(`Await approval: ${node.name}`)})\n// Approved branch\n${blockSource(node.approved, 0)}\n// Rejected branch\n${blockSource(node.rejected, 0)}`
    case "Parallel":
      return `${meta}\nyield* Effect.all([\n${node.branches.map((branch) => `  Effect.gen(function* () {\n${blockSource(branch, 4)}\n  })`).join(",\n")}\n], { concurrency: "unbounded" })`
    case "Repeat":
      return `${meta}\n// Repeat ${node.itemName} from ${JSON.stringify(node.collection)}\nyield* Effect.gen(function* () {\n${blockSource(node.body, 2)}\n})`
    case "Subworkflow":
      return `${meta}\nyield* Effect.log(${JSON.stringify(`Run subworkflow: ${node.workflowName}`)})`
  }
}

const encodeWorkflow = (workflow: WorkflowIR): string => JSON.stringify(JSON.stringify(workflow))

export const printEffectWorkflow = (workflow: WorkflowIR): string => {
  const identifier = safeIdentifier(workflow.name)
  return `import { Effect, Schema } from "effect"\nimport { Workflow } from "effect/unstable/workflow"\n\n// Generated from the visual Workflow IR. Reviewable by technical staff.\n// @workflow-ir ${encodeWorkflow(workflow)}\nexport const ${identifier} = Workflow.make(${JSON.stringify(workflow.name)}, {\n  payload: {},\n  success: Schema.Void,\n  error: Schema.Never,\n  idempotencyKey: () => ${JSON.stringify(workflow.name)},\n})\n\nexport const ${identifier}Layer = ${identifier}.toLayer((input, _executionId) =>\n  Effect.gen(function* () {\n${blockSource(workflow.body)}\n  }),\n)\n`
}

const workflowNamePattern = /Workflow\.make\(\s*["']([^"']+)["']/
const workflowIrPattern = /\/\/\s*@workflow-ir\s+("(?:[^"\\]|\\.)*")/

export const parseEffectWorkflow = (source: string): WorkflowIR => {
  const irMatch = workflowIrPattern.exec(source)
  if (irMatch?.[1] !== undefined) {
    const serialized: string = JSON.parse(irMatch[1])
    return JSON.parse(serialized) as WorkflowIR
  }

  const nameMatch = workflowNamePattern.exec(source)
  if (nameMatch?.[1] === undefined) throw new Error("Expected Workflow.make(\"WorkflowName\", ...)")
  return { version: 2, name: nameMatch[1], body: { nodes: [] } }
}
