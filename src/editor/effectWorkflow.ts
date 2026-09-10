import { Workflow } from "effect/unstable/workflow"

/**
 * Re-export the official Effect Workflow constructor as the execution model
 * understood by the visual editor.
 *
 * The editor IR is intentionally separate from the runtime. It describes the
 * visualizable control-flow structure while Effect remains responsible for
 * durable execution.
 */
export const makeEffectWorkflow = Workflow.make

export type EffectWorkflow = Workflow.Any
