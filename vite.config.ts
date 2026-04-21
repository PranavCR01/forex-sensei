import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load ALL .env.local vars — prefix '' means no filter, returns VITE_* and plain vars alike
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Dev-only plugin: intercepts /api/* and executes the TypeScript handler
        // directly via Vite's SSR module loader, no separate server needed.
        // On Vercel (production) this plugin is irrelevant — Vercel handles /api/* natively.
        name: 'local-api',
        configureServer(server) {
          // Inject non-VITE_ vars (e.g. GROQ_API_KEY) into process.env so handlers
          // can read them. Vite normally only exposes VITE_* to client code.
          Object.entries(env).forEach(([key, val]) => {
            process.env[key] = val
          })

          server.middlewares.use(async (req, res, next) => {
            const url = (req.url ?? '').split('?')[0]
            if (!url.startsWith('/api/')) return next()

            const handlerName = url.replace(/^\/api\//, '')
            const handlerFile = path.resolve(process.cwd(), 'api', `${handlerName}.ts`)

            // Collect and parse request body
            const body = await new Promise<Record<string, unknown>>((resolve) => {
              let raw = ''
              req.on('data', (chunk: Buffer) => { raw += chunk.toString() })
              req.on('end', () => {
                try { resolve(JSON.parse(raw) as Record<string, unknown>) }
                catch { resolve({}) }
              })
            })

            // Minimal shims matching the VercelRequest/VercelResponse shapes the handler uses
            const mockReq = {
              method:  req.method ?? 'GET',
              body,
              query:   {} as Record<string, string>,
              headers: req.headers,
              url:     req.url,
            }
            const mockRes = {
              status: (code: number) => ({
                json: (payload: unknown) => {
                  res.writeHead(code, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify(payload))
                },
              }),
            }

            try {
              const mod = await server.ssrLoadModule(handlerFile)
              await (mod.default as (
                req: typeof mockReq,
                res: typeof mockRes,
              ) => Promise<void>)(mockReq, mockRes)
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: String(err) }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
