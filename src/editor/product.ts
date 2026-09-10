import type { Expression, WorkflowBlock, WorkflowIR, WorkflowNode } from "./ir.js"

export interface ValidationIssue {
  readonly nodeId?: string
  readonly message: string
  readonly severity: "error" | "warning"
}

const validateBlock = (block: WorkflowBlock, issues: ValidationIssue[]): void => {
  for (const node of block.nodes) {
    if (node._tag === "Activity" && node.name.trim() === "") issues.push({ nodeId: node.id, message: "La acción necesita un nombre.", severity: "error" })
    if (node._tag === "Condition") {
      if (node.condition._tag !== "Binary") issues.push({ nodeId: node.id, message: "Configura la condición.", severity: "error" })
      if (node.then.nodes.length === 0) issues.push({ nodeId: node.id, message: "La rama Sí está vacía.", severity: "warning" })
      if (node.else.nodes.length === 0) issues.push({ nodeId: node.id, message: "La rama No está vacía.", severity: "warning" })
      validateBlock(node.then, issues); validateBlock(node.else, issues)
    }
    if (node._tag === "Wait" && node.mode === "duration" && (node.durationSeconds ?? 0) <= 0) issues.push({ nodeId: node.id, message: "Indica cuánto tiempo esperar.", severity: "error" })
    if (node._tag === "Wait" && node.mode === "event" && !node.eventName?.trim()) issues.push({ nodeId: node.id, message: "Indica el evento que debe recibirse.", severity: "error" })
    if (node._tag === "Approval") { validateBlock(node.approved, issues); validateBlock(node.rejected, issues) }
    if (node._tag === "Parallel") {
      if (node.branches.length < 2) issues.push({ nodeId: node.id, message: "El bloque paralelo necesita al menos dos ramas.", severity: "error" })
      node.branches.forEach((branch) => validateBlock(branch, issues))
    }
    if (node._tag === "Repeat") validateBlock(node.body, issues)
    if (node._tag === "Subworkflow" && !node.workflowName.trim()) issues.push({ nodeId: node.id, message: "Selecciona un subworkflow.", severity: "error" })
  }
}

export const validateWorkflow = (workflow: WorkflowIR): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  if (!workflow.name.trim()) issues.push({ message: "El workflow necesita un nombre.", severity: "error" })
  if (workflow.body.nodes.length === 0) issues.push({ message: "Añade al menos un paso.", severity: "warning" })
  validateBlock(workflow.body, issues)
  return issues
}

const expressionText = (expression: Expression): string => {
  if (expression._tag === "Literal") return JSON.stringify(expression.value)
  if (expression._tag === "Reference") return expression.path.join(".")
  return `${expressionText(expression.left)} ${expression.operator} ${expressionText(expression.right)}`
}

const describeNode = (node: WorkflowNode): string => {
  switch (node._tag) {
    case "Activity": return `Ejecuta «${node.name}».`
    case "Condition": return `Comprueba si ${expressionText(node.condition)} y continúa por la rama correspondiente.`
    case "Wait": return node.mode === "duration" ? `Espera ${node.durationSeconds ?? 0} segundos.` : `Espera el evento «${node.eventName ?? ""}».`
    case "Approval": return `Solicita la aprobación «${node.name}» y continúa según se apruebe o rechace.`
    case "Parallel": return `Ejecuta ${node.branches.length} ramas en paralelo.`
    case "Repeat": return `Repite «${node.name}» para cada elemento de una colección.`
    case "Subworkflow": return `Ejecuta el subworkflow «${node.workflowName}».`
  }
}

export const summarizeWorkflow = (workflow: WorkflowIR): string => workflow.body.nodes.map(describeNode).join(" ")

export interface SimulationStep {
  readonly nodeId: string
  readonly label: string
  readonly status: "success" | "waiting" | "decision"
}

const simulateBlock = (block: WorkflowBlock, steps: SimulationStep[]): void => {
  for (const node of block.nodes) {
    if (node._tag === "Wait" || node._tag === "Approval") {
      steps.push({ nodeId: node.id, label: node.name, status: "waiting" })
      continue
    }
    if (node._tag === "Condition") {
      steps.push({ nodeId: node.id, label: expressionText(node.condition), status: "decision" })
      continue
    }
    steps.push({ nodeId: node.id, label: node._tag === "Subworkflow" ? node.workflowName : node.name, status: "success" })
  }
}

export const simulateWorkflow = (workflow: WorkflowIR): readonly SimulationStep[] => {
  const steps: SimulationStep[] = []
  simulateBlock(workflow.body, steps)
  return steps
}
