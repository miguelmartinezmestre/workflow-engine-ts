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

export interface ActivityNode {
  readonly _tag: "Activity"
  readonly id: NodeId
  readonly name: string
}

export interface ConditionNode {
  readonly _tag: "Condition"
  readonly id: NodeId
  readonly condition: Expression
  readonly then: WorkflowBlock
  readonly else?: WorkflowBlock
}

export type WorkflowNode = ActivityNode | ConditionNode

export interface WorkflowBlock {
  readonly nodes: readonly WorkflowNode[]
}

export interface WorkflowIR {
  readonly version: 1
  readonly name: string
  readonly body: WorkflowBlock
}

export const WorkflowIR = {
  empty: (name: string): WorkflowIR => ({
    version: 1,
    name,
    body: { nodes: [] },
  }),
} as const
