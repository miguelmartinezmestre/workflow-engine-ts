import { WorkflowIR } from "../editor/ir.js"

export interface Env {}

const json = (body: unknown, init: ResponseInit = {}): Response =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  })

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        runtime: "cloudflare-workers",
      })
    }

    if (request.method === "GET" && url.pathname === "/api/editor/example") {
      return json(WorkflowIR.empty("ExampleWorkflow"))
    }

    return new Response("Not Found", { status: 404 })
  },
} satisfies ExportedHandler<Env>
