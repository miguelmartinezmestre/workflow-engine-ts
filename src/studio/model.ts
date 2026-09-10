import type { Edge, Node } from "@xyflow/react"
import type { WorkflowBlock, WorkflowIR, WorkflowNode } from "../editor/ir.js"

export interface StudioNodeData extends Record<string, unknown> { readonly label: string; readonly kind: string }
export type StudioNode = Node<StudioNodeData>
export interface StudioGraph { readonly nodes: StudioNode[]; readonly edges: Edge[] }

const label = (node: WorkflowNode): string => {
  switch (node._tag) {
    case "Activity": return node.name
    case "Condition": return "◇ Condición"
    case "Wait": return `◷ ${node.name}`
    case "Approval": return `✓ ${node.name}`
    case "Parallel": return `⑂ ${node.name}`
    case "Repeat": return `↻ ${node.name}`
    case "Subworkflow": return `▣ ${node.name}`
  }
}

export const irToGraph = (workflow: WorkflowIR): StudioGraph => {
  const nodes: StudioNode[] = []
  const edges: Edge[] = []
  let row = 0

  const visit = (block: WorkflowBlock, depth: number, parent?: string, edgeLabel?: string): void => {
    let previous = parent
    block.nodes.forEach((node) => {
      const y = 100 + row * 120; row += 1
      nodes.push({ id: node.id, position: { x: 120 + depth * 260, y }, data: { label: label(node), kind: node._tag } })
      if (previous) edges.push({ id: `${previous}-${node.id}-${edges.length}`, source: previous, target: node.id, ...(edgeLabel ? { label: edgeLabel } : {}) })
      previous = node.id
      if (node._tag === "Condition") { visit(node.then, depth + 1, node.id, "Sí"); visit(node.else, depth + 1, node.id, "No") }
      if (node._tag === "Approval") { visit(node.approved, depth + 1, node.id, "Aprobado"); visit(node.rejected, depth + 1, node.id, "Rechazado") }
      if (node._tag === "Repeat") visit(node.body, depth + 1, node.id, "Cada elemento")
      if (node._tag === "Parallel") node.branches.forEach((branch, index) => visit(branch, depth + 1, node.id, `Rama ${index + 1}`))
    })
  }
  visit(workflow.body, 0)
  return { nodes, edges }
}

export const graphToIR = (_name: string, _nodes: readonly StudioNode[], _edges: readonly Edge[]): WorkflowIR => {
  throw new Error("The diagram is a generated projection. Edit the canonical Workflow IR instead.")
}
