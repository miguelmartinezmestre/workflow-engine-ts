import type { BlockPath, WorkflowBlock, WorkflowNode } from "../editor/index.js"

export type PrimitiveKind = WorkflowNode["_tag"]

interface StructuredEditorProps {
  readonly block: WorkflowBlock
  readonly path: BlockPath
  readonly onInsert: (path: BlockPath, index: number, kind: PrimitiveKind) => void
  readonly onEdit: (nodeId: string) => void
  readonly onDelete: (path: BlockPath, nodeId: string) => void
  readonly onMove: (path: BlockPath, nodeId: string, direction: -1 | 1) => void
  readonly depth?: number
}

const nodeTitle = (node: WorkflowNode): string => {
  switch (node._tag) {
    case "Activity": return node.name
    case "Condition": return "Condición"
    case "Wait": return node.name
    case "Approval": return node.name
    case "Parallel": return node.name
    case "Repeat": return node.name
    case "Subworkflow": return node.name
  }
}

const nodeSubtitle = (node: WorkflowNode): string => {
  switch (node._tag) {
    case "Activity": return node.description ?? "Acción"
    case "Condition": return "Decisión con ramas Sí / No"
    case "Wait": return node.mode === "duration" ? `Esperar ${node.durationSeconds ?? 0}s` : `Esperar ${node.eventName ?? "evento"}`
    case "Approval": return "Aprobación humana"
    case "Parallel": return `${node.branches.length} ramas en paralelo`
    case "Repeat": return `Para cada ${node.itemName}`
    case "Subworkflow": return `Ejecutar ${node.workflowName || "otro workflow"}`
  }
}

const icon = (tag: PrimitiveKind): string => ({ Activity: "→", Condition: "◇", Wait: "◷", Approval: "✓", Parallel: "⑂", Repeat: "↻", Subworkflow: "▣" })[tag]

function InsertMenu({ path, index, onInsert }: Pick<StructuredEditorProps, "path" | "onInsert"> & { readonly index: number }) {
  const choices: ReadonlyArray<[PrimitiveKind, string]> = [
    ["Activity", "Acción"], ["Condition", "Condición"], ["Approval", "Aprobación"], ["Wait", "Esperar"],
    ["Parallel", "En paralelo"], ["Repeat", "Repetir"], ["Subworkflow", "Subworkflow"],
  ]
  return <details className="structured-insert"><summary>＋</summary><div className="structured-insert-sheet"><strong>Añadir aquí</strong>{choices.map(([kind, label]) => <button key={kind} type="button" onClick={() => onInsert(path, index, kind)}><span>{icon(kind)}</span><b>{label}</b></button>)}</div></details>
}

function NestedBlock({ title, block, path, ...props }: Omit<StructuredEditorProps, "block" | "path"> & { readonly title: string; readonly block: WorkflowBlock; readonly path: BlockPath }) {
  return <section className="nested-branch"><div className="branch-title">{title}</div><StructuredEditor {...props} block={block} path={path} depth={(props.depth ?? 0) + 1} /></section>
}

export function StructuredEditor({ block, path, onInsert, onEdit, onDelete, onMove, depth = 0 }: StructuredEditorProps) {
  return <div className={`structured-flow depth-${Math.min(depth, 3)}`}>
    <InsertMenu path={path} index={0} onInsert={onInsert} />
    {block.nodes.map((node, index) => <div className="structured-node-wrap" key={node.id}>
      <article className={`structured-node node-${node._tag.toLowerCase()}`}>
        <button className="structured-node-main" type="button" onClick={() => onEdit(node.id)}><span className="structured-icon">{icon(node._tag)}</span><span><small>{node._tag}</small><strong>{nodeTitle(node)}</strong><em>{nodeSubtitle(node)}</em></span><i>›</i></button>
        <div className="structured-actions"><button type="button" disabled={index === 0} onClick={() => onMove(path, node.id, -1)}>↑</button><button type="button" disabled={index === block.nodes.length - 1} onClick={() => onMove(path, node.id, 1)}>↓</button><button className="delete" type="button" onClick={() => onDelete(path, node.id)}>Eliminar</button></div>
        {node._tag === "Condition" && <div className="nested-grid"><NestedBlock title="Sí" block={node.then} path={[...path, node.id, "then"]} onInsert={onInsert} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth} /><NestedBlock title="No" block={node.else} path={[...path, node.id, "else"]} onInsert={onInsert} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth} /></div>}
        {node._tag === "Approval" && <div className="nested-grid"><NestedBlock title="Aprobado" block={node.approved} path={[...path, node.id, "approved"]} onInsert={onInsert} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth} /><NestedBlock title="Rechazado" block={node.rejected} path={[...path, node.id, "rejected"]} onInsert={onInsert} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth} /></div>}
        {node._tag === "Repeat" && <NestedBlock title={`Para cada ${node.itemName}`} block={node.body} path={[...path, node.id, "body"]} onInsert={onInsert} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth} />}
        {node._tag === "Parallel" && <div className="parallel-branches">{node.branches.map((branch, branchIndex) => <NestedBlock key={branchIndex} title={`Rama ${branchIndex + 1}`} block={branch} path={[...path, node.id, branchIndex]} onInsert={onInsert} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth} />)}</div>}
      </article>
      <InsertMenu path={path} index={index + 1} onInsert={onInsert} />
    </div>)}
  </div>
}
