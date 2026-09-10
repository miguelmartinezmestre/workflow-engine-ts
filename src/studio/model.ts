import type { Edge, Node } from "@xyflow/react"
import type { WorkflowIR, WorkflowNode } from "../editor/ir.js"

export interface StudioNodeData extends Record<string, unknown> {
  readonly label: string
  readonly kind: "activity" | "condition"
  readonly activityName?: string
  readonly expression?: string
}

export type StudioNode = Node<StudioNodeData>

export interface StudioGraph {
  readonly nodes: StudioNode[]
  readonly edges: Edge[]
}

const nodeLabel = (node: WorkflowNode): string =>
  node._tag === "Activity" ? node.name : "Condition"

export const irToGraph = (workflow: WorkflowIR): StudioGraph => {
  const nodes: StudioNode[] = workflow.body.nodes.map((node, index) => {
    const data: StudioNodeData = node._tag === "Activity"
      ? {
          label: nodeLabel(node),
          kind: "activity",
          activityName: node.name,
        }
      : {
          label: nodeLabel(node),
          kind: "condition",
          expression: "condition",
        }

    return {
      id: node.id,
      type: "default",
      position: { x: 120 + index * 230, y: 180 },
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
    body: {
      nodes: ordered.map((node): WorkflowNode => ({
        _tag: "Activity",
        id: node.id,
        name: node.data.activityName ?? node.data.label,
      })),
    },
  }
}
