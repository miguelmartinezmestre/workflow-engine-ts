interface SavedWorkflow {
  readonly workflow: unknown
  readonly code: string
  readonly updatedAt: string
}

interface PublishedVersion extends SavedWorkflow {
  readonly version: number
  readonly publishedAt: string
}

interface WorkflowComment {
  readonly id: string
  readonly nodeId?: string
  readonly author: string
  readonly text: string
  readonly createdAt: string
}

export interface Env {
  readonly WORKFLOWS: KVNamespace
}

const json = (value: unknown, init?: ResponseInit): Response => Response.json(value, init)
const draftKey = "workflow:default:draft"
const historyKey = "workflow:default:history"
const commentsKey = "workflow:default:comments"

const readHistory = async (env: Env): Promise<PublishedVersion[]> =>
  (await env.WORKFLOWS.get<PublishedVersion[]>(historyKey, "json")) ?? []

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/api/health") return json({ ok: true, runtime: "cloudflare-workers" })

    if (url.pathname === "/api/workflows" && request.method === "GET") {
      const saved = await env.WORKFLOWS.get<SavedWorkflow>(draftKey, "json")
      return json({ saved })
    }

    if (url.pathname === "/api/workflows" && request.method === "PUT") {
      const value: unknown = await request.json()
      if (typeof value !== "object" || value === null || !("code" in value) || !("workflow" in value)) return json({ error: "Invalid workflow" }, { status: 400 })
      const saved = { ...value, updatedAt: new Date().toISOString() }
      await env.WORKFLOWS.put(draftKey, JSON.stringify(saved))
      return json({ ok: true, saved })
    }

    if (url.pathname === "/api/workflows/publish" && request.method === "POST") {
      const draft = await env.WORKFLOWS.get<SavedWorkflow>(draftKey, "json")
      if (draft === null) return json({ error: "Save a draft first" }, { status: 400 })
      const history = await readHistory(env)
      const version: PublishedVersion = { ...draft, version: (history[0]?.version ?? 0) + 1, publishedAt: new Date().toISOString() }
      const next = [version, ...history].slice(0, 50)
      await env.WORKFLOWS.put(historyKey, JSON.stringify(next))
      return json({ ok: true, version })
    }

    if (url.pathname === "/api/workflows/history" && request.method === "GET") return json({ history: await readHistory(env) })

    if (url.pathname === "/api/workflows/comments" && request.method === "GET") {
      return json({ comments: (await env.WORKFLOWS.get<WorkflowComment[]>(commentsKey, "json")) ?? [] })
    }

    if (url.pathname === "/api/workflows/comments" && request.method === "POST") {
      const body = await request.json<Record<string, unknown>>()
      if (typeof body.text !== "string" || body.text.trim() === "") return json({ error: "Comment text required" }, { status: 400 })
      const comments = (await env.WORKFLOWS.get<WorkflowComment[]>(commentsKey, "json")) ?? []
      const comment: WorkflowComment = {
        id: crypto.randomUUID(),
        ...(typeof body.nodeId === "string" ? { nodeId: body.nodeId } : {}),
        author: typeof body.author === "string" && body.author.trim() ? body.author : "Colaborador",
        text: body.text.trim(),
        createdAt: new Date().toISOString(),
      }
      await env.WORKFLOWS.put(commentsKey, JSON.stringify([comment, ...comments].slice(0, 200)))
      return json({ ok: true, comment })
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, { status: 404 })
    return new Response("Not found", { status: 404 })
  },
} satisfies ExportedHandler<Env>
