import type { Expression, WorkflowIR, WorkflowNode } from "./ir.js"

const safeIdentifier = (value: string): string => {
  const normalized = value.replace(/[^a-zA-Z0-9_$]/g, "_")
  return /^[a-zA-Z_$]/.test(normalized) ? normalized : `_${normalized}`
}

const expressionToSource = (expression: Expression): string => {
  switch (expression._tag) {
    case "Literal":
      return JSON.stringify(expression.value)
    case "Reference":
      return expression.path.join(".")
    case "Binary":
      return `${expressionToSource(expression.left)} ${expression.operator} ${expressionToSource(expression.right)}`
  }
}

const nodeSource = (node: WorkflowNode): string => {
  if (node._tag === "Condition") {
    const encoded = JSON.stringify(node.condition)
    return `      // @workflow-node ${node.id} condition ${JSON.stringify(encoded)}\n      if (${expressionToSource(node.condition)}) {\n        yield* Effect.log(${JSON.stringify(`Condition matched: ${node.id}`)})\n      }`
  }

  return `      // @workflow-node ${node.id} activity ${JSON.stringify(node.name)}\n      yield* Effect.log(${JSON.stringify(`Activity: ${node.name}`)})`
}

export const printEffectWorkflow = (workflow: WorkflowIR): string => {
  const identifier = safeIdentifier(workflow.name)
  const body = workflow.body.nodes.map(nodeSource).join("\n\n")

  return `import { Effect, Schema } from "effect"\nimport { Workflow } from "effect/unstable/workflow"\n\nexport const ${identifier} = Workflow.make(${JSON.stringify(workflow.name)}, {\n  payload: {},\n  success: Schema.Void,\n  error: Schema.Never,\n  idempotencyKey: () => ${JSON.stringify(workflow.name)},\n})\n\nexport const ${identifier}Layer = ${identifier}.toLayer((input, _executionId) =>\n  Effect.gen(function* () {\n${body || "      yield* Effect.void"}\n  }),\n)\n`
}

const workflowNamePattern = /Workflow\.make\(\s*["']([^"']+)["']/
const nodePattern = /\/\/\s*@workflow-node\s+(\S+)\s+(activity|condition)\s+("(?:[^"\\]|\\.)*")/g

export const parseEffectWorkflow = (source: string): WorkflowIR => {
  const nameMatch = workflowNamePattern.exec(source)
  if (nameMatch?.[1] === undefined) {
    throw new Error("Expected Workflow.make(\"WorkflowName\", ...)")
  }

  const nodes: WorkflowNode[] = []
  for (const match of source.matchAll(nodePattern)) {
    const id = match[1]
    const kind = match[2]
    const encoded = match[3]
    if (id === undefined || kind === undefined || encoded === undefined) continue

    if (kind === "activity") {
      const name: string = JSON.parse(encoded)
      nodes.push({ _tag: "Activity", id, name })
      continue
    }

    const serializedExpression: string = JSON.parse(encoded)
    const condition: Expression = JSON.parse(serializedExpression)
    nodes.push({ _tag: "Condition", id, condition, then: { nodes: [] } })
  }

  return {
    version: 1,
    name: nameMatch[1],
    body: { nodes },
  }
}
