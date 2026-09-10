export type NodeId = string

export type Literal = string | number | boolean | null

export type Expression =
  | { readonly _tag: "Literal"; readonly value: Literal }
  | { readonly _tag: "Reference"; readonly path: readonly string[] }
  | {
      readonly _tag: "Binary"
      readonly operator: "===" | "!==" | ">" | ">=" | "<" | "<="
      readonly left: Expression
      readonly right: Expression
    }

export type ValueSource =
  | { readonly _tag: "Literal"; readonly value: Literal }
  | { readonly _tag: "Reference"; readonly path: readonly string[] }

export interface ActivityNode {
  readonly _tag: "Activity"
  readonly id: NodeId
  readonly name: string
  readonly description?: string
  readonly inputs?: Readonly<Record<string, ValueSource>>
  readonly retry?: { readonly attempts: number; readonly delaySeconds: number }
  readonly timeoutSeconds?: number
}

export interface ConditionNode {
  readonly _tag: "Condition"
  readonly id: NodeId
  readonly condition: Expression
  readonly then: WorkflowBlock
  readonly else: WorkflowBlock
}

export interface WaitNode {
  readonly _tag: "Wait"
  readonly id: NodeId
  readonly name: string
  readonly mode: "duration" | "event"
  readonly durationSeconds?: number
  readonly eventName?: string
}

export interface ApprovalNode {
  readonly _tag: "Approval"
  readonly id: NodeId
  readonly name: string
  readonly approver: ValueSource
  readonly instructions?: string
  readonly approved: WorkflowBlock
  readonly rejected: WorkflowBlock
}

export interface ParallelNode {
  readonly _tag: "Parallel"
  readonly id: NodeId
  readonly name: string
  readonly branches: readonly WorkflowBlock[]
}

export interface RepeatNode {
  readonly _tag: "Repeat"
  readonly id: NodeId
  readonly name: string
  readonly collection: ValueSource
  readonly itemName: string
  readonly body: WorkflowBlock
}

export interface SubworkflowNode {
  readonly _tag: "Subworkflow"
  readonly id: NodeId
  readonly name: string
  readonly workflowName: string
  readonly inputs?: Readonly<Record<string, ValueSource>>
}

export type WorkflowNode =
  | ActivityNode
  | ConditionNode
  | WaitNode
  | ApprovalNode
  | ParallelNode
  | RepeatNode
  | SubworkflowNode

export interface WorkflowBlock {
  readonly nodes: readonly WorkflowNode[]
}

export interface WorkflowIR {
  readonly version: 2
  readonly name: string
  readonly description?: string
  readonly inputs?: readonly string[]
  readonly body: WorkflowBlock
}

export const WorkflowIR = {
  empty: (name: string): WorkflowIR => ({
    version: 2,
    name,
    body: { nodes: [] },
  }),
} as const
