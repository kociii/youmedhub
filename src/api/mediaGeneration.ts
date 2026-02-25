import type { GeneratedMediaType, VideoScriptItem } from '@/types/video'

export interface GenerateVideoVersionResult {
  url: string
  mediaType: GeneratedMediaType
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function makeStoryboardSvg(item: VideoScriptItem, version: number): string {
  const title = escapeText(item.onScreenText || item.visualContent || `镜头 ${item.sequenceNumber}`)
  const line2 = escapeText(`${item.shotType} · ${item.cameraMovement}`)

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>
  <rect x="24" y="24" width="592" height="312" rx="16" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="8 8"/>
  <text x="40" y="68" fill="#e5e7eb" font-size="24" font-family="system-ui, -apple-system, sans-serif">镜头 ${item.sequenceNumber} · 分镜图 v${version}</text>
  <text x="40" y="120" fill="#d1d5db" font-size="20" font-family="system-ui, -apple-system, sans-serif">${title}</text>
  <text x="40" y="158" fill="#9ca3af" font-size="16" font-family="system-ui, -apple-system, sans-serif">${line2}</text>
  <text x="40" y="320" fill="#6b7280" font-size="14" font-family="system-ui, -apple-system, sans-serif">${item.startTime} - ${item.endTime}</text>
</svg>`
}

function makeFallbackVideoPreviewSvg(item: VideoScriptItem, version: number): string {
  const title = escapeText(item.onScreenText || item.visualContent || `镜头 ${item.sequenceNumber}`)

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#0f172a"/>
  <circle cx="320" cy="180" r="64" fill="#1d4ed8" opacity="0.2"/>
  <polygon points="305,152 305,208 355,180" fill="#60a5fa"/>
  <text x="40" y="64" fill="#bfdbfe" font-size="24" font-family="system-ui, -apple-system, sans-serif">镜头 ${item.sequenceNumber} · 视频预览 v${version}</text>
  <text x="40" y="320" fill="#93c5fd" font-size="16" font-family="system-ui, -apple-system, sans-serif">${title}</text>
</svg>`
}

function getSupportedVideoMimeType(): string | null {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return null
  }

  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const candidate of candidates) {
    if (window.MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }

  return null
}

async function createCanvasPreviewVideo(item: VideoScriptItem, version: number): Promise<string | null> {
  if (typeof document === 'undefined') return null
  const mimeType = getSupportedVideoMimeType()
  if (!mimeType) return null

  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360

  const context = canvas.getContext('2d')
  if (!context) return null

  const stream = canvas.captureStream(12)
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []

  recorder.ondataavailable = event => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const drawFrame = (progress: number) => {
    context.fillStyle = '#0f172a'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = '#1d4ed8'
    context.fillRect(40, 280, 560 * progress, 10)
    context.strokeStyle = '#1e293b'
    context.strokeRect(40, 280, 560, 10)

    context.fillStyle = '#e2e8f0'
    context.font = '28px system-ui, -apple-system, sans-serif'
    context.fillText(`镜头 ${item.sequenceNumber} · 视频预览 v${version}`, 40, 72)

    context.fillStyle = '#94a3b8'
    context.font = '20px system-ui, -apple-system, sans-serif'
    context.fillText(item.onScreenText || item.visualContent || `镜头 ${item.sequenceNumber}`, 40, 112)
    context.fillText(`${item.startTime} - ${item.endTime}`, 40, 148)
  }

  recorder.start()
  const start = performance.now()
  const duration = 900

  return new Promise(resolve => {
    recorder.onerror = () => {
      stream.getTracks().forEach(track => track.stop())
      resolve(null)
    }

    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop())
      if (!chunks.length) {
        resolve(null)
        return
      }
      const blob = new Blob(chunks, { type: mimeType })
      resolve(URL.createObjectURL(blob))
    }

    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / duration)
      drawFrame(progress)

      if (progress >= 1) {
        recorder.stop()
        return
      }
      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  })
}

export async function generateStoryboardImageVersion(item: VideoScriptItem, version: number): Promise<string> {
  await sleep(600 + Math.floor(Math.random() * 300))
  return encodeSvg(makeStoryboardSvg(item, version))
}

export async function generateVideoVersion(
  item: VideoScriptItem,
  version: number,
  sourceVideoUrl?: string
): Promise<GenerateVideoVersionResult> {
  await sleep(800 + Math.floor(Math.random() * 400))

  if (sourceVideoUrl) {
    return {
      url: sourceVideoUrl,
      mediaType: 'segment',
    }
  }

  const generatedVideoUrl = await createCanvasPreviewVideo(item, version)
  if (generatedVideoUrl) {
    return {
      url: generatedVideoUrl,
      mediaType: 'video',
    }
  }

  return {
    url: encodeSvg(makeFallbackVideoPreviewSvg(item, version)),
    mediaType: 'image',
  }
}
