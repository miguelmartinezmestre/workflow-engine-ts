import { useCallback, useMemo, useState } from "react"
import { addEdge, Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Connection, type NodeMouseHandler } from "@xyflow/react"
import { parseEffectWorkflow, printEffectWorkflow, WorkflowIR } from "../editor/index.js"
import { workflowExamples } from "./examples.js"
import { MobileFlowEditor } from "./MobileFlowEditor.js"
import { graphToIR, irToGraph, type StudioNode, type StudioNodeData } from "./model.js"

const initialIR = WorkflowIR.empty("ExampleWorkflow")
const initialGraph = irToGraph(initialIR)
const newId = (): string => crypto.randomUUID()
type PrimitiveKind = "activity" | "condition"
type ConditionOperator = NonNullable<StudioNodeData["conditionOperator"]>
type MobileView = "edit" | "diagram"

const primitiveCatalog = [
  { kind: "activity" as const, icon: "→", title: "Acción", description: "Realizar una tarea o llamar a un servicio" },
  { kind: "condition" as const, icon: "◇", title: "Condición", description: "Tomar una decisión usando datos del workflow" },
]

const conditionLabel = (data: StudioNodeData): string => `${data.conditionField ?? "input.value"} ${data.conditionOperator ?? "==="} ${data.conditionValue ?? ""}`

const makeNodeData = (kind: PrimitiveKind): StudioNodeData => kind === "condition"
  ? { label: "input.value === valor", kind: "condition", conditionField: "input.value", conditionOperator: "===", conditionValue: "valor" }
  : { label: "Nueva acción", kind: "activity", activityName: "Nueva acción" }

const rebuildLinearEdges = (nodes: readonly StudioNode[]) => nodes.slice(1).map((node, index) => ({
  id: `${nodes[index]?.id ?? "start"}->${node.id}`,
  source: nodes[index]?.id ?? "",
  target: node.id,
}))

export function WorkflowStudio() {
  const [workflowName, setWorkflowName] = useState(initialIR.name)
  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)
  const [code, setCode] = useState(() => printEffectWorkflow(initialIR))
  const [message, setMessage] = useState("Borrador guardado")
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>("edit")

  const workflow = useMemo(() => graphToIR(workflowName, nodes, edges), [workflowName, nodes, edges])
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId])

  const replaceOrderedNodes = (nextNodes: StudioNode[]) => {
    const positioned = nextNodes.map((node, index) => ({ ...node, position: { x: 160, y: 100 + index * 120 } }))
    setNodes(positioned)
    setEdges(rebuildLinearEdges(positioned))
    setMessage("Cambios sin publicar")
  }

  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge(connection, current)), [setEdges])
  const onNodeClick: NodeMouseHandler<StudioNode> = (_event, node) => { setSelectedNodeId(node.id); setCatalogOpen(false) }

  const updateNodeData = (patch: Partial<StudioNodeData>) => {
    if (selectedNodeId === null) return
    setNodes((current) => current.map((node) => {
      if (node.id !== selectedNodeId) return node
      const data = { ...node.data, ...patch }
      return { ...node, data: { ...data, label: data.kind === "condition" ? conditionLabel(data) : data.activityName ?? data.label } }
    }))
    setMessage("Cambios sin publicar")
  }

  const insertPrimitive = (kind: PrimitiveKind, index = nodes.length) => {
    const id = newId()
    const node: StudioNode = { id, position: { x: 160, y: 100 + index * 120 }, data: makeNodeData(kind) }
    const next = [...nodes]
    next.splice(index, 0, node)
    replaceOrderedNodes(next)
    setSelectedNodeId(id)
    setCatalogOpen(false)
  }

  const deleteNode = (nodeId: string) => {
    replaceOrderedNodes(nodes.filter((node) => node.id !== nodeId))
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }

  const duplicateNode = (nodeId: string) => {
    const index = nodes.findIndex((node) => node.id === nodeId)
    const source = nodes[index]
    if (source === undefined) return
    const copy: StudioNode = { ...source, id: newId(), selected: false, data: { ...source.data } }
    const next = [...nodes]
    next.splice(index + 1, 0, copy)
    replaceOrderedNodes(next)
  }

  const moveNode = (nodeId: string, direction: -1 | 1) => {
    const index = nodes.findIndex((node) => node.id === nodeId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= nodes.length) return
    const next = [...nodes]
    const [node] = next.splice(index, 1)
    if (node === undefined) return
    next.splice(target, 0, node)
    replaceOrderedNodes(next)
  }

  const loadExample = (exampleId: string) => {
    const example = workflowExamples.find((candidate) => candidate.id === exampleId)
    if (example === undefined) return
    const graph = irToGraph(example.workflow)
    setWorkflowName(example.workflow.name); setNodes(graph.nodes); setEdges(graph.edges); setCode(printEffectWorkflow(example.workflow)); setSelectedNodeId(null); setMessage(`Ejemplo: ${example.title}`); setMobileMenuOpen(false)
  }

  const openCode = () => { setCode(printEffectWorkflow(workflow)); setAdvancedOpen(true); setMobileMenuOpen(false) }
  const importCode = () => {
    try {
      const parsed = parseEffectWorkflow(code); const graph = irToGraph(parsed)
      setWorkflowName(parsed.name); setNodes(graph.nodes); setEdges(graph.edges); setSelectedNodeId(null); setAdvancedOpen(false); setMessage("Cambios técnicos importados")
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo importar el código") }
  }
  const save = async () => {
    const generatedCode = printEffectWorkflow(workflow)
    const response = await fetch("/api/workflows", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflow, code: generatedCode }) })
    setCode(generatedCode); setMessage(response.ok ? "Borrador guardado ✓" : "No se pudo guardar"); setMobileMenuOpen(false)
  }

  return (
    <main className="studio-shell ui-first">
      <header className="product-header">
        <div className="workflow-identity"><span className="product-kicker">Workflow</span><input value={workflowName} onChange={(event) => { setWorkflowName(event.target.value); setMessage("Cambios sin publicar") }} aria-label="Nombre del workflow" /></div>
        <div className="save-state">{message}</div>
        <div className="header-actions desktop-only"><select aria-label="Ejemplos" defaultValue="" onChange={(event) => event.target.value && loadExample(event.target.value)}><option value="" disabled>Ejemplos</option>{workflowExamples.map((example) => <option key={example.id} value={example.id}>{example.title}</option>)}</select><button type="button" className="secondary" onClick={openCode}>Ver código</button><button type="button" className="primary" onClick={() => void save()}>Guardar borrador</button></div>
        <button type="button" className="mobile-menu-button mobile-only" onClick={() => setMobileMenuOpen((value) => !value)}>•••</button>
      </header>

      {mobileMenuOpen && <div className="mobile-product-menu"><select aria-label="Ejemplos" defaultValue="" onChange={(event) => event.target.value && loadExample(event.target.value)}><option value="" disabled>Cargar ejemplo…</option>{workflowExamples.map((example) => <option key={example.id} value={example.id}>{example.title}</option>)}</select><button type="button" onClick={openCode}>Vista técnica · Código Effect</button><button type="button" className="primary" onClick={() => void save()}>Guardar borrador</button></div>}

      <nav className="mobile-view-tabs mobile-only" aria-label="Modo de edición"><button type="button" className={mobileView === "edit" ? "active" : ""} onClick={() => setMobileView("edit")}>Editar</button><button type="button" className={mobileView === "diagram" ? "active" : ""} onClick={() => setMobileView("diagram")}>Diagrama</button></nav>

      <div className={`mobile-structured-view mobile-only ${mobileView === "edit" ? "active" : ""}`}><MobileFlowEditor nodes={nodes} edges={edges} onInsert={insertPrimitive} onEdit={setSelectedNodeId} onDelete={deleteNode} onDuplicate={duplicateNode} onMove={moveNode} /></div>

      <section className={`authoring-layout ${mobileView === "diagram" ? "mobile-diagram-active" : ""}`}>
        <aside className="catalog-panel desktop-only"><div className="side-title">Añadir al workflow</div><p className="side-copy">Construye el proceso usando bloques de negocio.</p>{primitiveCatalog.map((item) => <button key={item.kind} type="button" className="catalog-item" onClick={() => insertPrimitive(item.kind)}><span className="catalog-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}<div className="coming-soon"><span>Próximamente</span><small>Aprobación · Esperar · Paralelo · Repetir · Subworkflow</small></div></aside>

        <div className="canvas-panel business-canvas"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={() => setSelectedNodeId(null)} fitView panOnScroll selectionOnDrag={false}><Background /><MiniMap className="desktop-only" /><Controls /></ReactFlow>{nodes.length === 0 && <div className="empty-canvas"><div className="empty-icon">＋</div><strong>Empieza tu workflow</strong><span>Añade una acción o una condición. No necesitas escribir código.</span><button type="button" className="primary" onClick={() => setCatalogOpen(true)}>Añadir primer paso</button></div>}<button type="button" className="floating-add mobile-only" aria-label="Añadir paso" onClick={() => setCatalogOpen(true)}>＋</button>{catalogOpen && <div className="primitive-picker"><div className="picker-header"><strong>¿Qué quieres añadir?</strong><button type="button" onClick={() => setCatalogOpen(false)}>×</button></div>{primitiveCatalog.map((item) => <button key={item.kind} type="button" className="catalog-item" onClick={() => insertPrimitive(item.kind)}><span className="catalog-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}</div>}</div>

        <aside className={`properties-panel ${selectedNode === undefined ? "empty-properties" : ""}`}>{selectedNode === undefined ? <div className="properties-placeholder"><strong>Propiedades</strong><span>Selecciona un paso para configurarlo.</span></div> : <><div className="properties-header"><div><span className="eyebrow">{selectedNode.data.kind === "condition" ? "Condición" : "Acción"}</span><strong>{selectedNode.data.label}</strong></div><button type="button" onClick={() => setSelectedNodeId(null)}>×</button></div>{selectedNode.data.kind === "activity" ? <><label className="field"><span>¿Qué hace este paso?</span><input value={selectedNode.data.activityName ?? ""} onChange={(event) => updateNodeData({ activityName: event.target.value })} placeholder="Ej. Enviar confirmación" /></label><div className="friendly-note">Describe la acción en lenguaje de negocio. El código queda como vista técnica.</div></> : <><div className="condition-builder-title">Continuar cuando…</div><label className="field"><span>Dato</span><input value={selectedNode.data.conditionField ?? ""} onChange={(event) => updateNodeData({ conditionField: event.target.value })} placeholder="input.total" /></label><label className="field"><span>Comparación</span><select value={selectedNode.data.conditionOperator ?? "==="} onChange={(event) => updateNodeData({ conditionOperator: event.target.value as ConditionOperator })}><option value="===">es igual a</option><option value="!==">no es igual a</option><option value=">">es mayor que</option><option value=">=">es mayor o igual que</option><option value="<">es menor que</option><option value="<=">es menor o igual que</option></select></label><label className="field"><span>Valor</span><input value={selectedNode.data.conditionValue ?? ""} onChange={(event) => updateNodeData({ conditionValue: event.target.value })} placeholder="1000" /></label><div className="condition-preview">Si <strong>{selectedNode.data.conditionField ?? "el dato"}</strong> {selectedNode.data.conditionOperator ?? "==="} <strong>{selectedNode.data.conditionValue ?? "valor"}</strong></div></>}<button type="button" className="danger-button" onClick={() => deleteNode(selectedNode.id)}>Eliminar paso</button></>}</aside>
      </section>

      {advancedOpen && <div className="advanced-overlay" role="dialog" aria-modal="true" aria-label="Código Effect"><div className="advanced-panel"><div className="advanced-header"><div><span className="eyebrow">Vista avanzada</span><strong>Código Effect generado</strong><small>Normalmente el workflow se edita desde la interfaz.</small></div><button type="button" onClick={() => setAdvancedOpen(false)}>×</button></div><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Código Effect" /><div className="advanced-actions"><button type="button" className="secondary" onClick={() => setAdvancedOpen(false)}>Cerrar</button><button type="button" className="primary" onClick={importCode}>Importar cambios técnicos</button></div></div></div>}
    </main>
  )
}
