import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@xyflow/react/dist/style.css"
import "./studio.css"
import { WorkflowProductStudio } from "./studio/WorkflowProductStudio.js"

const root = document.getElementById("root")
if (root === null) throw new Error("Missing #root element")

createRoot(root).render(<StrictMode><WorkflowProductStudio /></StrictMode>)
