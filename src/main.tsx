import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@xyflow/react/dist/style.css"
import "./studio.css"
import { WorkflowStudio } from "./studio/WorkflowStudio.js"

const root = document.getElementById("root")

if (root === null) {
  throw new Error("Missing #root element")
}

createRoot(root).render(
  <StrictMode>
    <WorkflowStudio />
  </StrictMode>,
)
