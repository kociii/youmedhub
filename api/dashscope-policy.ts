/**
 * 百炼上传凭证代理接口
 *
 * 由于百炼 /api/v1/uploads 接口不支持跨域，通过此 Serverless Function 代理请求
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com'

function getBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader) return ''
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 启用 CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const model = (
    req.method === 'GET'
      ? req.query.model
      : req.body?.model
  )

  const apiKey = (
    req.method === 'GET'
      ? req.query.apiKey
      : getBearerToken(req.headers.authorization)
  )

  if (!model || typeof model !== 'string') {
    res.status(400).json({ error: 'Missing required parameter: model' })
    return
  }

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(400).json({ error: 'Missing required parameter: apiKey' })
    return
  }

  try {
    const url = `${DASHSCOPE_BASE_URL}/api/v1/uploads?action=getPolicy&model=${encodeURIComponent(model)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      res.status(response.status).json(errorData)
      return
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
      },
    })
  }
}
