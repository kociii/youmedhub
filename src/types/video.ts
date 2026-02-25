// 生成状态（分镜图 / 视频）
export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'
export type StoryboardImageStatus = GenerationStatus
export type GeneratedMediaType = 'image' | 'video' | 'segment'

export interface GeneratedMediaVersion {
  id: string
  url: string
  mediaType: GeneratedMediaType
  createdAt: string
}

export interface VideoScriptItem {
  sequenceNumber: number;      // 序号
  shotType: string;            // 景别
  cameraMovement: string;      // 运镜方式
  visualContent: string;       // 画面内容
  shootingGuide: string;       // 拍摄指导
  onScreenText: string;        // 画面文案/花字
  voiceover: string;           // 口播/台词
  audio: string;               // 音效/BGM
  startTime: string;           // 镜头开始时间 (MM:SS)
  endTime: string;             // 镜头结束时间 (MM:SS)
  duration: string;            // 镜头时长 (MM:SS)
  storyboardImage?: string;    // 分镜图 URL
  imageStatus?: StoryboardImageStatus; // 分镜图生成状态
  imageError?: string;         // 分镜图失败原因
  storyboardVersions?: GeneratedMediaVersion[] // 分镜图版本列表
  activeStoryboardVersionId?: string // 当前选中分镜图版本
  videoStatus?: GenerationStatus // 视频生成状态
  videoError?: string // 视频生成失败原因
  videoVersions?: GeneratedMediaVersion[] // 视频版本列表
  activeVideoVersionId?: string // 当前选中视频版本
}

// API 返回结果
export interface VideoAnalysisResponse {
  rep: VideoScriptItem[];
}

// 分析状态
export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

// Token 使用统计
export interface TokenUsage {
  prompt_tokens: number;      // 输入 Tokens
  completion_tokens: number;  // 输出 Tokens
  total_tokens: number;       // 总计 Tokens
}

// 生成模式下的脚本候选
export interface ScriptCandidate {
  id: string
  title: string
  markdown: string
  scriptData: VideoScriptItem[]
  tokenUsage: TokenUsage | null
}

// 生成流程第一步的输入快照
export interface GenerationInputSnapshot {
  videoType: string
  requirementSummary: string
  style?: string
  duration?: string
  additionalNotes?: string
  scriptCount: number
  hasImageInput: boolean
  hasReferenceScript: boolean
  submittedAt: string
}
