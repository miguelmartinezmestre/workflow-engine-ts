import type { WorkflowIR } from "../editor/ir.js"

export interface WorkflowExample {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly workflow: WorkflowIR
}

export const workflowExamples: readonly WorkflowExample[] = [
  {
    id: "order-processing",
    title: "Procesar pedido",
    description: "Valida un pedido, cobra el pago, prepara el envío y notifica al cliente.",
    workflow: {
      version: 1,
      name: "ProcessOrder",
      body: {
        nodes: [
          { _tag: "Activity", id: "validate-order", name: "ValidateOrder" },
          { _tag: "Activity", id: "charge-payment", name: "ChargePayment" },
          { _tag: "Activity", id: "create-shipment", name: "CreateShipment" },
          { _tag: "Activity", id: "send-confirmation", name: "SendConfirmation" },
        ],
      },
    },
  },
  {
    id: "employee-onboarding",
    title: "Onboarding de empleado",
    description: "Crea accesos, asigna equipo, agenda la bienvenida y envía documentación.",
    workflow: {
      version: 1,
      name: "EmployeeOnboarding",
      body: {
        nodes: [
          { _tag: "Activity", id: "create-accounts", name: "CreateAccounts" },
          { _tag: "Activity", id: "assign-equipment", name: "AssignEquipment" },
          { _tag: "Activity", id: "schedule-welcome", name: "ScheduleWelcome" },
          { _tag: "Activity", id: "send-documents", name: "SendDocuments" },
        ],
      },
    },
  },
  {
    id: "support-ticket",
    title: "Ticket de soporte",
    description: "Clasifica una incidencia, asigna responsable, investiga y comunica la resolución.",
    workflow: {
      version: 1,
      name: "SupportTicket",
      body: {
        nodes: [
          { _tag: "Activity", id: "classify-ticket", name: "ClassifyTicket" },
          { _tag: "Activity", id: "assign-owner", name: "AssignOwner" },
          { _tag: "Activity", id: "investigate", name: "Investigate" },
          { _tag: "Activity", id: "resolve-ticket", name: "ResolveTicket" },
          { _tag: "Activity", id: "notify-requester", name: "NotifyRequester" },
        ],
      },
    },
  },
] as const
