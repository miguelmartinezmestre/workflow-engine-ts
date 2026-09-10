import { useEffect, useMemo, useState } from "react"
import { Background, Controls, ReactFlow } from "@xyflow/react"
import {
  findNode, insertNode, moveNode, parseEffectWorkflow, printEffectWorkflow, removeNode,
  simulateWorkflow, summarizeWorkflow, updateNode, validateWorkflow, WorkflowIR,
  type BlockPath, type ValueSource, type WorkflowIR as WorkflowIRType, type WorkflowNode,
} from "../editor/index.js"
import { workflowExamples } from "./examples.js"
import { irToGraph } from "./model.js"
import { StructuredEditor, type PrimitiveKind } from "./StructuredEditor.js"

type View = "edit" | "diagram" | "issues" | "history"
interface HistoryItem { readonly version: number; readonly publishedAt: string }
interface CommentItem { readonly id: string; readonly nodeId?: string; readonly author: string; readonly text: string; readonly createdAt: string }

const id = (): string => crypto.randomUUID()
const ref = (path: string): ValueSource => ({ _tag: "Reference", path: path.split(".").filter(Boolean) })

const makeNode = (kind: PrimitiveKind): WorkflowNode => {
  switch (kind) {
    case "Activity": return { _tag: "Activity", id: id(), name: "Nueva acción" }
    case "Condition": return { _tag: "Condition", id: id(), condition: { _tag: "Binary", operator: "===", left: { _tag: "Reference", path: ["input", "value"] }, right: { _tag: "Literal", value: "valor" } }, then: { nodes: [] }, else: { nodes: [] } }
    case "Wait": return { _tag: "Wait", id: id(), name: "Esperar", mode: "duration", durationSeconds: 60 }
    case "Approval": return { _tag: "Approval", id: id(), name: "Solicitar aprobación", approver: ref("input.approver"), approved: { nodes: [] }, rejected: { nodes: [] } }
    case "Parallel": return { _tag: "Parallel", id: id(), name: "En paralelo", branches: [{ nodes: [] }, { nodes: [] }] }
    case "Repeat": return { _tag: "Repeat", id: id(), name: "Repetir", collection: ref("input.items"), itemName: "elemento", body: { nodes: [] } }
    case "Subworkflow": return { _tag: "Subworkflow", id: id(), name: "Ejecutar workflow", workflowName: "" }
  }
}

const literal = (value: string): string | number | boolean | null => {
  if (value === "true") return true; if (value === "false") return false; if (value === "null") return null
  return value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : value
}

export function WorkflowProductStudio() {
  const [workflow, setWorkflow] = useState<WorkflowIRType>(() => WorkflowIR.empty("Nuevo workflow"))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<View>("edit")
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState("")
  const [testOpen, setTestOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [message, setMessage] = useState("Borrador local")
  const [history, setHistory] = useState<readonly HistoryItem[]>([])
  const [comments, setComments] = useState<readonly CommentItem[]>([])
  const [commentText, setCommentText] = useState("")

  const selected = selectedId === null ? undefined : findNode(workflow.body, selectedId)
  const issues = useMemo(() => validateWorkflow(workflow), [workflow])
  const graph = useMemo(() => irToGraph(workflow), [workflow])

  useEffect(() => { void (async () => {
    const [savedResponse, historyResponse, commentsResponse] = await Promise.all([fetch("/api/workflows"), fetch("/api/workflows/history"), fetch("/api/workflows/comments")])
    const saved = await savedResponse.json() as { saved?: { workflow?: WorkflowIRType } | null }
    const versions = await historyResponse.json() as { history?: HistoryItem[] }
    const notes = await commentsResponse.json() as { comments?: CommentItem[] }
    if (saved.saved?.workflow?.version === 2) setWorkflow(saved.saved.workflow)
    setHistory(versions.history ?? []); setComments(notes.comments ?? [])
  })() }, [])

  const changed = (next: WorkflowIRType) => { setWorkflow(next); setMessage("Cambios sin guardar") }
  const insert = (path: BlockPath, index: number, kind: PrimitiveKind) => changed(insertNode(workflow, path, index, makeNode(kind)))
  const remove = (path: BlockPath, nodeId: string) => { changed(removeNode(workflow, path, nodeId)); if (selectedId === nodeId) setSelectedId(null) }
  const move = (path: BlockPath, nodeId: string, direction: -1 | 1) => changed(moveNode(workflow, path, nodeId, direction))
  const patch = (transform: (node: WorkflowNode) => WorkflowNode) => { if (selectedId) changed(updateNode(workflow, selectedId, transform)) }

  const save = async () => {
    const response = await fetch("/api/workflows", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflow, code: printEffectWorkflow(workflow) }) })
    setMessage(response.ok ? "Borrador guardado ✓" : "Error al guardar")
  }
  const publish = async () => {
    if (issues.some((issue) => issue.severity === "error")) { setView("issues"); setMessage("Corrige los errores antes de publicar"); return }
    await save(); const response = await fetch("/api/workflows/publish", { method: "POST" }); const result = await response.json() as { version?: HistoryItem }
    if (result.version) setHistory((current) => [result.version!, ...current]); setMessage(result.version ? `Versión ${result.version.version} publicada ✓` : "No se pudo publicar")
  }
  const addComment = async () => {
    if (!commentText.trim()) return
    const response = await fetch("/api/workflows/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodeId: selectedId, author: "Colaborador", text: commentText }) })
    const result = await response.json() as { comment?: CommentItem }; if (result.comment) setComments((current) => [result.comment!, ...current]); setCommentText("")
  }
  const openCode = () => { setCode(printEffectWorkflow(workflow)); setCodeOpen(true); setMenuOpen(false) }
  const importCode = () => { try { const parsed = parseEffectWorkflow(code); changed(parsed); setCodeOpen(false) } catch (error) { setMessage(error instanceof Error ? error.message : "Código no importable") } }

  return <main className="product-studio">
    <header className="product-topbar"><div><span>Workflow</span><input value={workflow.name} onChange={(e) => changed({ ...workflow, name: e.target.value })} /></div><small>{message}</small><div className="top-actions"><button onClick={() => setTestOpen(true)}>▶ Probar</button><button onClick={() => void save()}>Guardar</button><button className="publish" onClick={() => void publish()}>Publicar</button></div><button className="mobile-more" onClick={() => setMenuOpen((v) => !v)}>•••</button></header>
    {menuOpen && <div className="mobile-overflow"><button onClick={() => setTestOpen(true)}>▶ Probar workflow</button><button onClick={() => setSummaryOpen(true)}>Resumen</button><button onClick={openCode}>Vista técnica</button><button onClick={() => void save()}>Guardar borrador</button><button className="publish" onClick={() => void publish()}>Publicar</button></div>}

    <nav className="product-tabs"><button className={view === "edit" ? "active" : ""} onClick={() => setView("edit")}>Editar</button><button className={view === "diagram" ? "active" : ""} onClick={() => setView("diagram")}>Diagrama</button><button className={view === "issues" ? "active" : ""} onClick={() => setView("issues")}>Validación {issues.length > 0 && <b>{issues.length}</b>}</button><button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>Historial</button></nav>

    <section className="product-body">
      {view === "edit" && <div className="structured-page"><div className="structured-toolbar"><div><strong>Diseña el proceso</strong><span>Inserta pasos donde los necesites. El diagrama se genera automáticamente.</span></div><button onClick={() => setSummaryOpen(true)}>Resumen</button></div><StructuredEditor block={workflow.body} path={[]} onInsert={insert} onEdit={setSelectedId} onDelete={remove} onMove={move} /></div>}
      {view === "diagram" && <div className="generated-diagram"><ReactFlow nodes={graph.nodes} edges={graph.edges} fitView nodesDraggable={false} nodesConnectable={false}><Background/><Controls/></ReactFlow><span className="diagram-hint">Vista generada automáticamente · edita el proceso desde «Editar»</span></div>}
      {view === "issues" && <div className="product-list-page"><h2>Validación</h2>{issues.length === 0 ? <div className="success-card">✓ El workflow está listo para publicar.</div> : issues.map((issue, index) => <button key={index} className={`issue-card ${issue.severity}`} onClick={() => { if (issue.nodeId) { setSelectedId(issue.nodeId); setView("edit") } }}><strong>{issue.severity === "error" ? "Error" : "Revisar"}</strong><span>{issue.message}</span></button>)}</div>}
      {view === "history" && <div className="product-list-page"><h2>Versiones publicadas</h2>{history.length === 0 ? <p>Aún no hay versiones publicadas.</p> : history.map((item) => <div className="history-card" key={item.version}><strong>v{item.version}</strong><span>{new Date(item.publishedAt).toLocaleString()}</span></div>)}</div>}
    </section>

    {selected && <div className="inspector-backdrop" onClick={() => setSelectedId(null)}><aside className="product-inspector" onClick={(e) => e.stopPropagation()}><div className="inspector-title"><div><small>{selected._tag}</small><strong>Configurar paso</strong></div><button onClick={() => setSelectedId(null)}>×</button></div><NodeFields node={selected} patch={patch} workflow={workflow}/><div className="comments"><strong>Comentarios</strong>{comments.filter((c) => c.nodeId === selected.id).map((c) => <div className="comment" key={c.id}><b>{c.author}</b><span>{c.text}</span></div>)}<textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Añadir comentario…"/><button onClick={() => void addComment()}>Comentar</button></div></aside></div>}

    {testOpen && <Modal title="Simulación" close={() => setTestOpen(false)}><p className="modal-copy">Vista previa segura: no ejecuta efectos externos.</p>{simulateWorkflow(workflow).map((step) => <div className={`simulation-step ${step.status}`} key={step.nodeId}><span>{step.status === "success" ? "✓" : step.status === "waiting" ? "◷" : "◇"}</span><strong>{step.label}</strong></div>)}</Modal>}
    {summaryOpen && <Modal title="Resumen del workflow" close={() => setSummaryOpen(false)}><p className="summary-text">{summarizeWorkflow(workflow) || "El workflow todavía está vacío."}</p></Modal>}
    {codeOpen && <div className="code-overlay"><div className="code-modal"><header><div><small>Vista avanzada</small><strong>Código Effect generado</strong></div><button onClick={() => setCodeOpen(false)}>×</button></header><textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}/><footer><button onClick={() => setCodeOpen(false)}>Cerrar</button><button className="publish" onClick={importCode}>Importar cambios compatibles</button></footer></div></div>}
  </main>
}

function Modal({ title, close, children }: { readonly title: string; readonly close: () => void; readonly children: React.ReactNode }) { return <div className="modal-backdrop" onClick={close}><div className="product-modal" onClick={(e) => e.stopPropagation()}><header><strong>{title}</strong><button onClick={close}>×</button></header><div>{children}</div></div></div> }

function SourceField({ label, source, change }: { readonly label: string; readonly source: ValueSource; readonly change: (source: ValueSource) => void }) { const value = source._tag === "Reference" ? source.path.join(".") : String(source.value ?? ""); return <label><span>{label}</span><select value={source._tag} onChange={(e) => change(e.target.value === "Reference" ? ref("input.value") : { _tag: "Literal", value: "" })}><option value="Reference">Dato del workflow</option><option value="Literal">Valor fijo</option></select><input value={value} onChange={(e) => change(source._tag === "Reference" ? ref(e.target.value) : { _tag: "Literal", value: literal(e.target.value) })}/></label> }

function NodeFields({ node, patch }: { readonly node: WorkflowNode; readonly patch: (transform: (node: WorkflowNode) => WorkflowNode) => void; readonly workflow: WorkflowIRType }) {
  if (node._tag === "Activity") return <><label><span>Nombre</span><input value={node.name} onChange={(e) => patch((n) => n._tag === "Activity" ? { ...n, name: e.target.value } : n)}/></label><label><span>Descripción</span><textarea value={node.description ?? ""} onChange={(e) => patch((n) => n._tag === "Activity" ? { ...n, description: e.target.value } : n)}/></label></>
  if (node._tag === "Condition" && node.condition._tag === "Binary") { const c = node.condition; return <><SourceField label="Dato" source={c.left._tag === "Reference" ? c.left : ref("input.value")} change={(left) => patch((n) => n._tag === "Condition" && n.condition._tag === "Binary" ? { ...n, condition: { ...n.condition, left: left._tag === "Reference" ? left : { _tag: "Reference", path: ["input","value"] } } } : n)}/><label><span>Comparación</span><select value={c.operator} onChange={(e) => patch((n) => n._tag === "Condition" && n.condition._tag === "Binary" ? { ...n, condition: { ...n.condition, operator: e.target.value as typeof c.operator } } : n)}><option value="===">es igual a</option><option value="!==">no es igual a</option><option value=">">es mayor que</option><option value=">=">es mayor o igual que</option><option value="<">es menor que</option><option value="<=">es menor o igual que</option></select></label><SourceField label="Valor" source={c.right._tag === "Literal" ? c.right : { _tag: "Literal", value: "" }} change={(right) => patch((n) => n._tag === "Condition" && n.condition._tag === "Binary" ? { ...n, condition: { ...n.condition, right } } : n)}/></> }
  if (node._tag === "Wait") return <><label><span>Nombre</span><input value={node.name} onChange={(e) => patch((n) => n._tag === "Wait" ? { ...n, name: e.target.value } : n)}/></label><label><span>Esperar por</span><