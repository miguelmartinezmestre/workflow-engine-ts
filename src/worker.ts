interface SavedWorkflow {
  readonly workflow: unknown
  readonly code: string
}

export interface Env {
  readonly WORKFLOWS: KVNamespace
}

const json = (value: unknown, init?: ResponseInit): Response =>
  Response.json(value, init)

const workflowKey = "default"

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/api/health") {
      return json({ ok: true, runtime: "cloudflare-workers" })
    }

    if (url.pathname === "/api/workflows" && request.method === "GET") {
      const saved = await env.WORKFLOWS.get<SavedWorkflow>(workflowKey, "json")
      return saved === null ? json({ saved: null }) : json({ saved })
    }

    if (url.pathname === "/api/workflows" && request.method === "PUT") {
      const value: unknown = await request.json()
      if (typeof value !== "object" || value === null || !("code" in value)) {
        return json({ error: "Invalid workflow" }, { status: 400 })
      }
      await env.WORKFLOWS.put(workflowKey, JSON.stringify(value))
      return json({ ok: true })
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, { status: 404 })
    }

    return new Response("Not found", { status: 404 })
  },
} satisfies ExportedHandler<Env>
