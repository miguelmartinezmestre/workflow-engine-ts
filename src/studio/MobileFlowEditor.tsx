import type { Edge } from "@xyflow/react"
import type { StudioNode, StudioNodeData } from "./model.js"

type PrimitiveKind = "activity" | "condition"

interface MobileFlowEditorProps {
  readonly nodes: readonly StudioNode[]
  readonly edges: readonly Edge[]
  readonly onInsert: (kind: PrimitiveKind, index: number) => void
  readonly onEdit: (nodeId: string) => void
  readonly onDelete: (nodeId: string) => void
  readonly onDuplicate: (nodeId: string) => void
  readonly onMove: (nodeId: string, direction: -1 | 1) => void
}

const operatorLabel = (operator: StudioNodeData["conditionOperator"]): string => {
  switch (operator) {
    case "===": return "es igual a"
    case "!==": return "no es igual a"
    case ">": return "es mayor que"
    case ">=": return "es mayor o igual que"
    case "<": return "es menor que"
    case "<=": return "es menor o igual que"
    default: return "se compara con"
  }
}

function AddBetween({ index, onInsert }: { readonly index: number; readonly onInsert: MobileFlowEditorProps["onInsert"] }) {
  return (
    <details className="mobile-insert">
      <summary aria-label="Añadir paso aquí">＋</summary>
      <div className="mobile-insert-menu">
        <button type="button" onClick={() => onInsert("activity", index)}><strong>→ Acción</strong><span>Realizar una tarea</span></button>
        <button type="button" onClick={() => onInsert("condition", index)}><strong>◇ Condición</strong><span>Tomar una decisión</span></button>
      </div>
    </details>
  )
}

export function MobileFlowEditor({ nodes, onInsert, onEdit, onDelete, onDuplicate, onMove }: MobileFlowEditorProps) {
  return (
    <div className="mobile-flow-editor">
      <div className="mobile-flow-intro">
        <strong>Construye el proceso</strong>
        <span>Toca un paso para configurarlo. Usa ＋ para insertar sin arrastrar.</span>
      </div>

      <AddBetween index={0} onInsert={onInsert} />

      {nodes.map((node, index) => (
        <div className="mobile-step-wrap" key={node.id}>
          <article className={`mobile-step mobile-step-${node.data.kind}`}>
            <button type="button" className="mobile-step-main" onClick={() => onEdit(node.id)}>
              <span className="mobile-step-icon">{node.data.kind === "condition" ? "◇" : "→"}</span>
              <span className="mobile-step-copy">
                <small>{node.data.kind === "condition" ? "Condición" : `Paso ${index + 1}`}</small>
                <strong>{node.data.kind === "condition" ? "Tomar una decisión" : node.data.label}</strong>
                {node.data.kind === "condition" && (
                  <span>{node.data.conditionField ?? "Dato"} {operatorLabel(node.data.conditionOperator)} {node.data.conditionValue ?? "valor"}</span>
                )}
              </span>
              <span className="mobile-step-chevron">›</span>
            </button>

            <div className="mobile-step-actions" aria-label={`Acciones de ${node.data.label}`}>
              <button type="button" disabled={index === 0} onClick={() => onMove(node.id, -1)} aria-label="Mover arriba">↑</button>
              <button type="button" disabled={index === nodes.length - 1} onClick={() => onMove(node.id, 1)} aria-label="Mover abajo">↓</button>
              <button type="button" onClick={() => onDuplicate(node.id)} aria-label="Duplicar paso">⧉</button>
              <button type="button" className="mobile-step-delete" onClick={() => onDelete(node.id)} aria-label="Eliminar paso">⌫</button>
            </div>
          </article>
          <AddBetween index={index + 1} onInsert={onInsert} />
        </div>
      ))}

      {nodes.length === 0 && (
        <div className="mobile-flow-empty">
          <strong>Aún no hay pasos</strong>
          <span>Pulsa ＋ y elige una acción o condición.</span>
        </div>
      )}
    </div>
  )
}
