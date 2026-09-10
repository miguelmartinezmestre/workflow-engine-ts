import type { Edge, Node } from "@xyflow/react"
import type { Expression, WorkflowIR, WorkflowNode } from "../editor/ir.js"

export interface StudioNodeData extends Record<string, unknown> {
  readonly label: string
  readonly kind: "activity" | "condition"
  readonly activityName?: string
  readonly conditionField?: string
  readonly conditionOperator?: "===" | "!==" | ">" | ">=" | "<" | "<="
  readonly conditionValue?: string
}

export type StudioNode = Node<StudioNodeData>

export interface StudioGraph {
  readonly nodes: StudioNode[]
  readonly edges: Edge[]
}

const conditionText = (node: Extract<WorkflowNode, { readonly _tag: "Condition" }>): string => {
  if (node.condition._tag !== "Binary") return "Condición"
  const left = node.condition.left._tag === "Reference" ? node.condition.left.path.join(".") : "valor"
  const right = node.condition.right._tag === "Literal" ? String(node.condition.right.value) : "valor"
  return `${left} ${node.condition.operator} ${right}`
}

export const irToGraph = (workflow: WorkflowIR): StudioGraph => {
  const nodes: StudioNode[] = workflow.body.nodes.map((node, index) => {
    const data: StudioNodeData = node._tag === "Activity"
      ? { label: node.name, kind: "activity", activityName: node.name }
      : {
          label: conditionText(node),
          kind: "condition",
          ...(node.condition._tag === "Binary" && node.condition.left._tag === "Reference"
            ? { conditionField: node.condition.left.path.join(".") }
            : {}),
          ...(node.condition._tag === "Binary" ? { conditionOperator: node.condition.operator } : {}),
          ...(node.condition._tag === "Binary" && node.condition.right._tag === "Literal"
            ? { conditionValue: String(node.condition.right.value) }
            : {}),
        }

    return {
      id: node.id,
      type: "default",
      position: { x: 160 + index * 240, y: 180 },
      data,
    }
  })

  const edges: Edge[] = nodes.slice(1).map((node, index) => ({
    id: `${nodes[index]?.id ?? "start"}->${node.id}`,
    source: nodes[index]?.id ?? "",
    target: node.id,
  }))

  return { nodes, edges }
}

const literalFromInput = (value: string): string | number | boolean | null => {
  const trimmed = value.trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (trimmed === "null") return null
  if (trimmed !== "" && Number.isFinite(Number(trimmed))) return Number(trimmed)
  return value
}

const nodeToIR = (node: StudioNode): WorkflowNode => {
  if (node.data.kind === "condition") {
    const expression: Expression = {
      _tag: "Binary",
      operator: node.data.conditionOperator ?? "===",
      left: {
        _tag: "Reference",
        path: (node.data.conditionField ?? "input.value").split(".").filter(Boolean),
      },
      right: {
        _tag: "Literal",
        value: literalFromInput(node.data.conditionValue ?? ""),
      },
    }

    return {
      _tag: "Condition",
      id: node.id,
      condition: expression,
      then: { nodes: [] },
    }
  }

  return {
    _tag: "Activity",
    id: node.id,
    name: node.data.activityName ?? node.data.label,
  }
}

export const graphToIR = (
  name: string,
  nodes: readonly StudioNode[],
  edges: readonly Edge[],
): WorkflowIR => {
  const incoming = new Map<string, number>()
  for (const node of nodes) incoming.set(node.id, 0)
  for (const edge of edges) incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    const list = outgoing.get(edge.source) ?? []
    list.push(edge.target)
    outgoing.set(edge.source, list)
  }

  const ordered: StudioNode[] = []
  const queue = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0)
  const seen = new Set<string>()

  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined || seen.has(node.id)) continue
    seen.add(node.id)
    ordered.push(node)
    for (const target of outgoing.get(node.id) ?? []) {
      const next = (incoming.get(target) ?? 1) - 1
      incoming.set(target, next)
      if (next === 0) {
        const targetNode = byId.get(target)
        if (targetNode !== undefined) queue.push(targetNode)
      }
    }
  }

  for (const node of nodes) if (!seen.has(node.id)) ordered.push(node)

  return {
    version: 1,
    name,
    body: { nodes: ordered.map(nodeToIR) },
  }
}
