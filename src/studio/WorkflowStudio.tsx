import { useCallback, useMemo, useState } from "react"
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
} from "@xyflow/react"
import { parseEffectWorkflow, printEffectWorkflow, WorkflowIR } from "../editor/index.js"
import { workflowExamples } from "./examples.js"
import { graphToIR, irToGraph, type StudioNode } from "./model.js"

const initialIR = WorkflowIR.empty("ExampleWorkflow")
const initialGraph = irToGraph(initialIR)

const newId = (): string => crypto.randomUUID()

export function WorkflowStudio() {
  const [workflowName, setWorkflowName] = useState(initialIR.name)
  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)
  const [code, setCode] = useState(() => printEffectWorkflow(initialIR))
  const [message, setMessage] = useState("Ready")
  const [mobilePanel, setMobilePanel] = useState<"canvas" | "code">("canvas")
  const [toolsOpen, setToolsOpen] = useState(false)

  const workflow = useMemo(
    () => graphToIR(workflowName, nodes, edges),
    [workflowName, nodes, edges],
  )

  const onConnect = useCallback(
    (connection: Connection) => setEdges((current) => addEdge(connection, current)),
    [setEdges],
  )

  const addActivity = () => {
    const id = newId()
    setNodes((current) => [
      ...current,
      {
        id,
        position: { x: 100 + current.length * 60, y: 100 + current.length * 70 },
        data: {
          label: `Activity ${current.length + 1}`,
          kind: "activity",
          activityName: `Activity ${current.length + 1}`,
        },
      },
    ])
    setMobilePanel("canvas")
    setToolsOpen(false)
  }

  const loadExample = (exampleId: string) => {
    const example = workflowExamples.find((candidate) => candidate.id === exampleId)
    if (example === undefined) return
    const graph = irToGraph(example.workflow)
    setWorkflowName(example.workflow.name)
    setNodes(graph.nodes)
    setEdges(graph.edges)
    setCode(printEffectWorkflow(example.workflow))
    setMessage(`Ejemplo cargado: ${example.title}`)
    setMobilePanel("canvas")
    setToolsOpen(false)
  }

  const syncCanvasToCode = () => {
    setCode(printEffectWorkflow(workflow))
    setMessage("Canvas → Effect synchronized")
    setMobilePanel("code")
    setToolsOpen(false)
  }

  const syncCodeToCanvas = () => {
    try {
      const parsed = parseEffectWorkflow(code)
      const graph = irToGraph(parsed)
      setWorkflowName(parsed.name)
      setNodes(graph.nodes)
      setEdges(graph.edges)
      setMessage("Effect → Canvas synchronized")
      setMobilePanel("canvas")
      setToolsOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not parse workflow")
    }
  }

  const save = async () => {
    const response = await fetch("/api/workflows", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflow, code }),
    })
    setMessage(response.ok ? "Workflow saved" : "Could not save workflow")
    setToolsOpen(false)
  }

  return (
    <main className="studio-shell">
      <header className="toolbar">
        <div className="brand-block">
          <strong>Effect Workflow Studio</strong>
          <span className="status">{message}</span>
        </div>

        <div className="desktop-tools">
          <select
            aria-label="Ejemplos"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value !== "") loadExample(event.target.value)
            }}
          >
            <option value="" disabled>Ejemplos…</option>
            {workflowExamples.map((example) => (
              <option key={example.id} value={example.id}>{example.title}</option>
            ))}
          </select>
          <input
            aria-label="Workflow name"
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
          />
          <button type="button" onClick={addActivity}>+ Activity</button>
          <button type="button" onClick={syncCanvasToCode}>Canvas → Code</button>
          <button type="button" onClick={syncCodeToCanvas}>Code → Canvas</button>
          <button type="button" onClick={() => void save()}>Save</button>
        </div>

        <div className="mobile-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Añadir actividad"
            onClick={addActivity}
          >
            +
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Abrir herramientas"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((open) => !open)}
          >
            ⋯
          </button>
        </div>
      </header>

      {toolsOpen && (
        <div className="mobile-tools-sheet">
          <input
            aria-label="Workflow name"
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
          />
          <select
            aria-label="Ejemplos"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value !== "") loadExample(event.target.value)
            }}
          >
            <option value="" disabled>Seleccionar ejemplo…</option>
            {workflowExamples.map((example) => (
              <option key={example.id} value={example.id}>{example.title}</option>
            ))}
          </select>
          <button type="button" onClick={syncCanvasToCode}>Sincronizar Canvas → Código</button>
          <button type="button" onClick={syncCodeToCanvas}>Sincronizar Código → Canvas</button>
          <button type="button" onClick={() => void save()}>Guardar workflow</button>
        </div>
      )}

      <nav className="mobile-tabs" aria-label="Vista del editor">
        <button
          type="button"
          className={mobilePanel === "canvas" ? "active" : ""}
          onClick={() => setMobilePanel("canvas")}
        >
          Canvas
        </button>
        <button
          type="button"
          className={mobilePanel === "code" ? "active" : ""}
          onClick={() => setMobilePanel("code")}
        >
          Código
        </button>
      </nav>

      <section className={`workspace mobile-${mobilePanel}`}>
        <div className="canvas-panel">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            panOnScroll
            selectionOnDrag={false}
          >
            <Background />
            <MiniMap className="desktop-minimap" />
            <Controls />
          </ReactFlow>
        </div>

        <div className="code-panel">
          <div className="panel-title">Effect TypeScript</div>
          <textarea
            aria-label="Effect TypeScript source"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
      </section>
    </main>
  )
}
