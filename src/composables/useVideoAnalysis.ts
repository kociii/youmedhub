import { ref, computed } from 'vue'
import type { VideoScriptItem, AnalysisStatus, TokenUsage } from '@/types/video'
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, type ModelConfig } from '@/config/models'

const videoFile = ref<File | null>(null)
const videoUrl = ref('')
const uploadProgress = ref(0)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')

const analysisStatus = ref<AnalysisStatus>('idle')
const markdownContent = ref('')
const scriptItems = ref<VideoScriptItem[]>([])
const tokenUsage = ref<TokenUsage | null>(null)

const viewMode = ref<'markdown' | 'table'>('table')

// API Key（优先从 localStorage 读取，其次从环境变量读取）
const dashscopeApiKey = ref(
  localStorage.getItem('dashscope_api_key') ||
  import.meta.env.VITE_DASHSCOPE_API_KEY ||
  ''
)

// 选中的模型 - 初始化为默认模型
const selectedModel = ref<ModelConfig>(
  AVAILABLE_MODELS.find(m => m.id === DEFAULT_MODEL_ID) || AVAILABLE_MODELS[0]
)

// 分析参数配置
const analysisParams = ref({
  temperature: 0.1,
  top_p: 0.1,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
})

// 思考模式开关
const enableThinking = ref(false)

// 思考内容状态
const thinkingContent = ref('')
const isThinking = ref(false)

const hasVideo = computed(() => !!videoUrl.value)
const hasResult = computed(() => !!markdownContent.value)
const isAnalyzing = computed(() => analysisStatus.value === 'analyzing')

// 当前 API Key
const currentApiKey = computed(() => dashscopeApiKey.value)

// 是否有有效的 API Key
const hasValidApiKey = computed(() => {
  return !!currentApiKey.value
})

export function useVideoAnalysis() {
  function setDashscopeApiKey(key: string) {
    dashscopeApiKey.value = key
    localStorage.setItem('dashscope_api_key', key)
  }

  function setSelectedModel(model: ModelConfig) {
    selectedModel.value = model
  }

  function resetAnalysis() {
    analysisStatus.value = 'idle'
    markdownContent.value = ''
    scriptItems.value = []
    tokenUsage.value = null
    thinkingContent.value = ''
    isThinking.value = false
  }

  function resetAll() {
    videoFile.value = null
    videoUrl.value = ''
    uploadProgress.value = 0
    uploadStatus.value = 'idle'
    resetAnalysis()
  }

  return {
    videoFile,
    videoUrl,
    uploadProgress,
    uploadStatus,
    analysisStatus,
    markdownContent,
    scriptItems,
    tokenUsage,
    viewMode,
    selectedModel,
    analysisParams,
    enableThinking,
    thinkingContent,
    isThinking,
    dashscopeApiKey,
    currentApiKey,
    hasVideo,
    hasResult,
    isAnalyzing,
    hasValidApiKey,
    setDashscopeApiKey,
    setSelectedModel,
    resetAnalysis,
    resetAll,
  }
}
