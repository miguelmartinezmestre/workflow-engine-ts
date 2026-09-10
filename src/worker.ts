export interface Env {
  readonly ASSETS: Fetcher
}

const json = (value: unknown, init?: ResponseInit): Response =>
  Response.json(value, init)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        runtime: "cloudflare-workers",
      })
    }

    if (url.pathname.startsWith("/api/")) {
      return json(
        { error: "Not found" },
        { status: 404 },
      )
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
