/**
 * 开发环境代理服务器
 * 用于代理百炼 API 请求，解决 CORS 问题
 */

const http = require('http')
const https = require('https')
const url = require('url')

const PORT = 3000

const server = http.createServer(async (req, res) => {
  // 启用 CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const parsedUrl = url.parse(req.url, true)

  // 代理 /api/dashscope-policy 请求
  if (parsedUrl.pathname === '/api/dashscope-policy') {
    const { model, apiKey } = parsedUrl.query

    if (!model || !apiKey) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Missing model or apiKey' }))
      return
    }

    const targetUrl = `https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=${encodeURIComponent(model)}`

    try {
      const proxyReq = https.get(
        targetUrl,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
        (proxyRes) => {
          res.statusCode = proxyRes.statusCode
          res.setHeader('Content-Type', 'application/json')

          let data = ''
          proxyRes.on('data', (chunk) => {
            data += chunk
          })
          proxyRes.on('end', () => {
            res.end(data)
          })
        }
      )

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err)
        res.statusCode = 500
        res.end(JSON.stringify({ error: err.message }))
      })
    } catch (err) {
      console.error('Proxy error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  // 其他请求返回 404
  res.statusCode = 404
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`开发代理服务器运行在 http://localhost:${PORT}`)
  console.log('支持路由: /api/dashscope-policy')
})

module.exports = server
