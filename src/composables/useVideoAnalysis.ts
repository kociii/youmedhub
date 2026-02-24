import { ref, computed } from 'vue'
import type { VideoScriptItem, AnalysisStatus, TokenUsage } from '@/types/video'
import type { ModelConfig } from '@/config/models'

const videoFile = ref<File | null>(null)
const videoUrl = ref('')
const uploadProgress = ref(0)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')

const analysisStatus = ref<AnalysisStatus>('idle')
const markdownContent = ref('')
const scriptItems = ref<VideoScriptItem[]>([])
const tokenUsage = ref<TokenUsage | null>(null)

const viewMode = ref<'markdown' | 'table'>('table')

// 支持双渠道 API Key
const dashscopeApiKey = ref(localStorage.getItem('dashscope_api_key') || '')
const arkApiKey = ref(localStorage.getItem('ark_api_key') || '')

// 选中的模型
const selectedModel = ref<ModelConfig | null>(null)

const hasVideo = computed(() => !!videoUrl.value)
const hasResult = computed(() => !!markdownContent.value)
const isAnalyzing = computed(() => analysisStatus.value === 'analyzing')

// 根据选中的模型获取对应的 API Key
const currentApiKey = computed(() => {
  if (!selectedModel.value) return ''
  return selectedModel.value.provider === 'aliyun'
    ? dashscopeApiKey.value
    : arkApiKey.value
})

// 是否有有效的 API Key
const hasValidApiKey = computed(() => {
  return !!currentApiKey.value
})

export function useVideoAnalysis() {
  function setDashscopeApiKey(key: string) {
    dashscopeApiKey.value = key
    localStorage.setItem('dashscope_api_key', key)
  }

  function setArkApiKey(key: string) {
    arkApiKey.value = key
    localStorage.setItem('ark_api_key', key)
  }

  function setSelectedModel(model: ModelConfig) {
    selectedModel.value = model
  }

  function resetAnalysis() {
    analysisStatus.value = 'idle'
    markdownContent.value = ''
    scriptItems.value = []
    tokenUsage.value = null
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
    dashscopeApiKey,
    arkApiKey,
    currentApiKey,
    hasVideo,
    hasResult,
    isAnalyzing,
    hasValidApiKey,
    setDashscopeApiKey,
    setArkApiKey,
    setSelectedModel,
    resetAnalysis,
    resetAll,
  }
}
