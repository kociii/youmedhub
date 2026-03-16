import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import https from 'https'

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com'

function getBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader) return ''
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'dashscope-policy-dev-proxy',
      configureServer(server) {
        server.middlewares.use('/api/dashscope-policy', (req, res, next) => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          if (req.method !== 'POST') {
            next()
            return
          }

          let body = ''
          req.on('data', chunk => {
            body += chunk
          })

          req.on('end', () => {
            let model = ''
            try {
              const parsed = body ? JSON.parse(body) : {}
              model = typeof parsed.model === 'string' ? parsed.model : ''
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: '请求体 JSON 格式错误' } }))
              return
            }

            const apiKey = getBearerToken(req.headers.authorization)

            if (!model) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: 'Missing required parameter: model' } }))
              return
            }

            if (!apiKey) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: 'Missing required parameter: apiKey' } }))
              return
            }

            const targetUrl = `${DASHSCOPE_BASE_URL}/api/v1/uploads?action=getPolicy&model=${encodeURIComponent(model)}`

            const proxyReq = https.get(
              targetUrl,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
              },
              (proxyRes) => {
                res.statusCode = proxyRes.statusCode || 500
                res.setHeader('Content-Type', 'application/json')

                let data = ''
                proxyRes.on('data', chunk => {
                  data += chunk
                })
                proxyRes.on('end', () => {
                  res.end(data)
                })
              }
            )

            proxyReq.on('error', (error) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                error: {
                  message: error.message,
                },
              }))
            })
          })

          req.on('error', (error) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: {
                message: error.message,
              },
            }))
          })
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
