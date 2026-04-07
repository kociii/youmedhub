import type { VideoScriptItem } from '@/types/video'

export type ProjectNodeType = 'script' | 'text' | 'image' | 'video' | 'note' | 'ai_call'
export type AiModelCategory = 'text' | 'image' | 'video'

export type AiCardOutputType = 'text' | 'markdown' | 'json' | 'image' | 'video' | 'script'
export type AiCardRunStatus = 'idle' | 'dirty' | 'running' | 'success' | 'error'

export interface AiCallCardConfig {
  modelCategory: AiModelCategory
  modelId: string
  promptTemplate: string
  inputBindings: Array<{ nodeId: string; path?: string }>
  outputType: AiCardOutputType
}

export interface AiCallCardResult {
  status: AiCardRunStatus
  outputType: AiCardOutputType
  content: unknown
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  errorCode?: string
  errorMessage?: string
  finishedAt?: string
}

export interface ProjectScriptNodeData {
  sequenceNumber: VideoScriptItem['sequenceNumber']
  shotType: VideoScriptItem['shotType']
  cameraMovement: VideoScriptItem['cameraMovement']
  visualContent: VideoScriptItem['visualContent']
  voiceover: VideoScriptItem['voiceover']
  duration: VideoScriptItem['duration']
  startTime: VideoScriptItem['startTime']
  endTime: VideoScriptItem['endTime']
}

export interface ProjectScriptNode {
  id: string
  type: 'script'
  x: number
  y: number
  width: number
  height: number
  data: ProjectScriptNodeData
}

export interface ProjectTextNode {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  height: number
  data: {
    title: string
    format: 'plain' | 'markdown'
    content: string
  }
}

export interface ProjectAssetRef {
  assetId?: string
  provider: 'aliyun-oss'
  bucket?: string
  objectKey?: string
  url?: string
  mimeType?: string
  sizeBytes?: number
  width?: number
  height?: number
  durationMs?: number
  coverUrl?: string
}

export interface ProjectImageNode {
  id: string
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  data: {
    title: string
    caption: string
    asset: ProjectAssetRef
  }
}

export interface ProjectVideoNode {
  id: string
  type: 'video'
  x: number
  y: number
  width: number
  height: number
  data: {
    title: string
    caption: string
    asset: ProjectAssetRef
  }
}

export interface ProjectNoteNode {
  id: string
  type: 'note'
  x: number
  y: number
  width: number
  height: number
  data: {
    content: string
  }
}

export interface ProjectAiCallNode {
  id: string
  type: 'ai_call'
  x: number
  y: number
  width: number
  height: number
  data: {
    title: string
    config: AiCallCardConfig
    result: AiCallCardResult
  }
}

export type ProjectCanvasNode =
  | ProjectScriptNode
  | ProjectTextNode
  | ProjectImageNode
  | ProjectVideoNode
  | ProjectNoteNode
  | ProjectAiCallNode

export interface ProjectCanvasState {
  nodes: ProjectCanvasNode[]
  viewport: {
    x: number
    y: number
    zoom: number
  }
}
