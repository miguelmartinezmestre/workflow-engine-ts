import type { WorkflowBlock, WorkflowIR, WorkflowNode } from "./ir.js"

export type BlockPath = readonly (string | number)[]

export const getBlock = (workflow: WorkflowIR, path: BlockPath): WorkflowBlock => {
  let block = workflow.body
  for (let index = 0; index < path.length; index += 2) {
    const nodeId = path[index]
    const slot = path[index + 1]
    const node = block.nodes.find((candidate) => candidate.id === nodeId)
    if (node === undefined || slot === undefined) throw new Error("Invalid workflow block path")
    if (node._tag === "Condition" && (slot === "then" || slot === "else")) block = node[slot]
    else if (node._tag === "Approval" && (slot === "approved" || slot === "rejected")) block = node[slot]
    else if (node._tag === "Repeat" && slot === "body") block = node.body
    else if (node._tag === "Parallel" && typeof slot === "number") block = node.branches[slot] ?? { nodes: [] }
    else throw new Error("Invalid workflow block slot")
  }
  return block
}

const mapBlockAtPath = (
  block: WorkflowBlock,
  path: BlockPath,
  depth: number,
  transform: (block: WorkflowBlock) => WorkflowBlock,
): WorkflowBlock => {
  if (depth >= path.length) return transform(block)
  const nodeId = path[depth]
  const slot = path[depth + 1]
  return {
    nodes: block.nodes.map((node): WorkflowNode => {
      if (node.id !== nodeId) return node
      const nextDepth = depth + 2
      if (node._tag === "Condition" && slot === "then") return { ...node, then: mapBlockAtPath(node.then, path, nextDepth, transform) }
      if (node._tag === "Condition" && slot === "else") return { ...node, else: mapBlockAtPath(node.else, path, nextDepth, transform) }
      if (node._tag === "Approval" && slot === "approved") return { ...node, approved: mapBlockAtPath(node.approved, path, nextDepth, transform) }
      if (node._tag === "Approval" && slot === "rejected") return { ...node, rejected: mapBlockAtPath(node.rejected, path, nextDepth, transform) }
      if (node._tag === "Repeat" && slot === "body") return { ...node, body: mapBlockAtPath(node.body, path, nextDepth, transform) }
      if (node._tag === "Parallel" && typeof slot === "number") return { ...node, branches: node.branches.map((branch, index) => index === slot ? mapBlockAtPath(branch, path, nextDepth, transform) : branch) }
      return node
    }),
  }
}

export const updateBlock = (workflow: WorkflowIR, path: BlockPath, transform: (block: WorkflowBlock) => WorkflowBlock): WorkflowIR => ({
  ...workflow,
  body: mapBlockAtPath(workflow.body, path, 0, transform),
})

export const insertNode = (workflow: WorkflowIR, path: BlockPath, index: number, node: WorkflowNode): WorkflowIR =>
  updateBlock(workflow, path, (block) => ({ nodes: [...block.nodes.slice(0, index), node, ...block.nodes.slice(index)] }))

export const removeNode = (workflow: WorkflowIR, path: BlockPath, nodeId: string): WorkflowIR =>
  updateBlock(workflow, path, (block) => ({ nodes: block.nodes.filter((node) => node.id !== nodeId) }))

export const moveNode = (workflow: WorkflowIR, path: BlockPath, nodeId: string, direction: -1 | 1): WorkflowIR =>
  updateBlock(workflow, path, (block) => {
    const nodes = [...block.nodes]
    const from = nodes.findIndex((node) => node.id === nodeId)
    const to = from + direction
    if (from < 0 || to < 0 || to >= nodes.length) return block
    const current = nodes[from]
    const target = nodes[to]
    if (current === undefined || target === undefined) return block
    nodes[from] = target
    nodes[to] = current
    return { nodes }
  })

const mapNode = (block: WorkflowBlock, nodeId: string, transform: (node: WorkflowNode) => WorkflowNode): WorkflowBlock => ({
  nodes: block.nodes.map((node): WorkflowNode => {
    if (node.id === nodeId) return transform(node)
    if (node._tag === "Condition") return { ...node, then: mapNode(node.then, nodeId, transform), else: mapNode(node.else, nodeId, transform) }
    if (node._tag === "Approval") return { ...node, approved: mapNode(node.approved, nodeId, transform), rejected: mapNode(node.rejected, nodeId, transform) }
    if (node._tag === "Repeat") return { ...node, body: mapNode(node.body, nodeId, transform) }
    if (node._tag === "Parallel") return { ...node, branches: node.branches.map((branch) => mapNode(branch, nodeId, transform)) }
    return node
  }),
})

export const updateNode = (workflow: WorkflowIR, nodeId: string, transform: (node: WorkflowNode) => WorkflowNode): WorkflowIR => ({
  ...workflow,
  body: mapNode(workflow.body, nodeId, transform),
})

export const findNode = (block: WorkflowBlock, nodeId: string): WorkflowNode | undefined => {
  for (const node of block.nodes) {
    if (node.id === nodeId) return node
    const nested = node._tag === "Condition" ? [node.then, node.else]
      : node._tag === "Approval" ? [node.approved, node.rejected]
      : node._tag === "Repeat" ? [node.body]
      : node._tag === "Parallel" ? node.branches
      : []
    for (const child of nested) {
      const found = findNode(child, nodeId)
      if (found !== undefined) return found
    }
  }
  return undefined
}
