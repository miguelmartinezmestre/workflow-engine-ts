import type { WorkflowIR } from "../editor/ir.js"

export interface WorkflowExample { readonly id: string; readonly title: string; readonly description: string; readonly workflow: WorkflowIR }

export const workflowExamples: readonly WorkflowExample[] = [
  { id: "order-approval", title: "Pedido con aprobación", description: "Decisión por importe, aprobación, pago y confirmación.", workflow: { version: 2, name: "Procesar pedido", inputs: ["orderId", "total", "approver"], body: { nodes: [
    { _tag: "Activity", id: "get-order", name: "Obtener pedido", description: "Carga los datos del pedido" },
    { _tag: "Condition", id: "high-value", condition: { _tag: "Binary", operator: ">", left: { _tag: "Reference", path: ["input","total"] }, right: { _tag: "Literal", value: 1000 } }, then: { nodes: [{ _tag: "Approval", id: "manager-approval", name: "Aprobación del responsable", approver: { _tag: "Reference", path: ["input","approver"] }, instructions: "Revisar pedidos superiores a 1.000 €", approved: { nodes: [{ _tag: "Activity", id: "approved-note", name: "Registrar aprobación" }] }, rejected: { nodes: [{ _tag: "Activity", id: "cancel-order", name: "Cancelar pedido" }] } }] }, else: { nodes: [] } },
    { _tag: "Activity", id: "charge", name: "Cobrar pedido" }, { _tag: "Activity", id: "confirm", name: "Enviar confirmación" },
  ] } } },
  { id: "employee-onboarding", title: "Onboarding completo", description: "Tareas paralelas, espera y bienvenida.", workflow: { version: 2, name: "Onboarding de empleado", inputs: ["employeeEmail"], body: { nodes: [
    { _tag: "Parallel", id: "setup", name: "Preparar incorporación", branches: [{ nodes: [{ _tag: "Activity", id: "accounts", name: "Crear cuentas" }] }, { nodes: [{ _tag: "Activity", id: "equipment", name: "Preparar equipo" }] }] },
    { _tag: "Wait", id: "wait-start", name: "Esperar al primer día", mode: "event", eventName: "employee.started" }, { _tag: "Activity", id: "welcome", name: "Enviar bienvenida" },
  ] } } },
  { id: "batch-support", title: "Procesar tickets", description: "Repite un proceso para una colección de tickets.", workflow: { version: 2, name: "Procesar tickets", inputs: ["tickets"], body: { nodes: [
    { _tag: "Repeat", id: "each-ticket", name: "Procesar cada ticket", collection: { _tag: "Reference", path: ["input","tickets"] }, itemName: "ticket", body: { nodes: [{ _tag: "Activity", id: "classify", name: "Clasificar ticket" }, { _tag: "Subworkflow", id: "resolve", name: "Resolver incidencia", workflowName: "ResolveSupportTicket" }] } },
  ] } } },
] as const
