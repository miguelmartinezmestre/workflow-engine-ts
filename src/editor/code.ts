import type { WorkflowIR, WorkflowNode } from "./ir.js"

const safeIdentifier = (value: string): string => {
  const normalized = value.replace(/[^a-zA-Z0-9_$]/g, "_")
  return /^[a-zA-Z_$]/.test(normalized) ? normalized : `_${normalized}`
}

const activityLine = (node: WorkflowNode): string => {
  if (node._tag !== "Activity") {
    return `      // @workflow-node ${node.id} condition\n      // Visual condition support is coming next.`
  }

  return `      // @workflow-node ${node.id} activity ${JSON.stringify(node.name)}\n      yield* Effect.log(${JSON.stringify(`Activity: ${node.name}`)})`
}

export const printEffectWorkflow = (workflow: WorkflowIR): string => {
  const identifier = safeIdentifier(workflow.name)
  const body = workflow.body.nodes.map(activityLine).join("\n\n")

  return `import { Effect, Schema } from "effect"\nimport { Workflow } from "effect/unstable/workflow"\n\nexport const ${identifier} = Workflow.make(${JSON.stringify(workflow.name)}, {\n  payload: {},\n  success: Schema.Void,\n  error: Schema.Never,\n  idempotencyKey: () => ${JSON.stringify(workflow.name)},\n})\n\nexport const ${identifier}Layer = ${identifier}.toLayer((_payload, _executionId) =>\n  Effect.gen(function* () {\n${body || "      yield* Effect.void"}\n  }),\n)\n`
}

const workflowNamePattern = /Workflow\.make\(\s*["']([^"']+)["']/
const activityPattern = /\/\/\s*@workflow-node\s+(\S+)\s+activity\s+("(?:[^"\\]|\\.)*")/g

export const parseEffectWorkflow = (source: string): WorkflowIR => {
  const nameMatch = workflowNamePattern.exec(source)
  if (nameMatch?.[1] === undefined) {
    throw new Error("Expected Workflow.make(\"WorkflowName\", ...)")
  }

  const nodes: WorkflowNode[] = []
  for (const match of source.matchAll(activityPattern)) {
    const id = match[1]
    const encodedName = match[2]
    if (id === undefined || encodedName === undefined) continue
    const name: string = JSON.parse(encodedName)
    nodes.push({ _tag: "Activity", id, name })
  }

  return {
    version: 1,
    name: nameMatch[1],
    body: { nodes },
  }
}
