/**
 * 图片风格转换脚本
 * 使用 RunningHub API 将图片转换为指定风格
 *
 * 注意：这是一个长连接 API，需要等待较长时间（可能 30-120 秒）
 *
 * 使用方法：
 * 1. 确保 Node.js 已安装
 * 2. 直接运行: npx tsx scripts/image-style-transform.ts
 * 3. 使用代理: HTTPS_PROXY=http://127.0.0.1:7890 npx tsx scripts/image-style-transform.ts
 */

import { ProxyAgent } from 'undici'
import { setGlobalDispatcher } from 'undici'

const API_URL = 'https://www.runninghub.cn/openapi/v2/rhart-image-n-g31-flash/image-to-image'
const API_KEY = 'ee4739f9078f4879859d5021ef235ea1'
const TIMEOUT_MS = 180000 // 3 分钟超时

// 检查并配置代理
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
if (proxyUrl) {
  console.log(`🌐 使用代理: ${proxyUrl}`)
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}

interface TransformRequest {
  imageUrls: string[]
  prompt: string
  resolution: '1k' | '2k' | '4k'
}

interface TransformResponse {
  code: number
  message: string
  data?: {
    images?: Array<{
      url: string
    }>
    taskId?: string
  }
}

// 创建带超时的 AbortController
function createTimeoutController(timeout: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  return { controller, timeoutId }
}

// 进度指示器
function startProgressIndicator(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  let elapsed = 0

  process.stdout.write(message)

  const interval = setInterval(() => {
    const frame = frames[i = (i + 1) % frames.length]
    elapsed += 1
    process.stdout.write(`\r${frame} ${message} (${elapsed}s)`)
  }, 1000)

  return {
    stop: () => {
      clearInterval(interval)
      process.stdout.write('\r' + ' '.repeat(60) + '\r')
    },
    getElapsed: () => elapsed
  }
}

async function transformImage(params: TransformRequest): Promise<TransformResponse> {
  console.log('🎨 开始转换图片...')
  console.log('📝 提示词:', params.prompt.substring(0, 50) + '...')
  console.log('📐 分辨率:', params.resolution)
  console.log('⏱️  预计等待时间: 30-120 秒\n')

  const { controller, timeoutId } = createTimeoutController(TIMEOUT_MS)
  const progress = startProgressIndicator('正在处理中，请耐心等待...')

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    })

    progress.stop()

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败: ${response.status} ${errorText}`)
    }

    const result = await response.json() as TransformResponse
    return result
  } catch (error) {
    progress.stop()

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时（超过 ${TIMEOUT_MS / 1000} 秒）`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function main() {
  // 默认参数
  const defaultParams: TransformRequest = {
    imageUrls: [
      'https://www.runninghub.cn/view?filename=174ba2c54b8af1fdd5a01370049dd6407a693d8b05b4717079698e87680e038e.png&type=input&subfolder=&Rh-Comfy-Auth=eyJ1c2VySWQiOiIzZjY1MTNlNWEwNjY1N2I4OGYyNjU5NTEzYmU3ZDM0YyIsInNpZ25FeHBpcmUiOjE3NzI3NjM5NDg5OTQsInRzIjoxNzcyMTU5MTQ4OTk0LCJzaWduIjoiNjAxNWY0MjI2NzI2Yzk0YTFkOTExNjg2NGRkZmU2ZTAifQ==&Rh-Identify=3f6513e5a06657b88f2659513be7d34c&rand=0.8958046627705756'
    ],
    prompt: '将这张线稿转换为明代水墨武侠风格的精细彩图。严格保留人物的动作轮廓与黑鸦的形态，将背景替换为风雪交加的竹林。增强水墨晕染的纹理感，整体色调偏冷，烘托出肃杀的氛围。',
    resolution: '1k'
  }

  const startTime = Date.now()

  try {
    const result = await transformImage(defaultParams)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (result.code === 0 && result.data?.images) {
      console.log(`\n✅ 转换成功! (耗时 ${elapsed} 秒)`)
      console.log('\n📷 生成的图片:')
      result.data.images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.url}`)
      })
    } else {
      console.log(`\n❌ 转换失败: ${result.message}`)
      if (result.data) {
        console.log('📦 返回数据:', JSON.stringify(result.data, null, 2))
      }
    }
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`\n❌ 发生错误 (耗时 ${elapsed} 秒):`, error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
