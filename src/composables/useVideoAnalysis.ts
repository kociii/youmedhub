import { ref, computed } from 'vue'
import type { VideoScriptItem, AnalysisStatus, TokenUsage } from '@/types/video'

const videoFile = ref<File | null>(null)
const videoUrl = ref('')
const uploadProgress = ref(0)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')

const analysisStatus = ref<AnalysisStatus>('idle')
const markdownContent = ref('')
const scriptItems = ref<VideoScriptItem[]>([])
const tokenUsage = ref<TokenUsage | null>(null)

const viewMode = ref<'markdown' | 'table'>('table')

const apiKey = ref(localStorage.getItem('dashscope_api_key') || '')

const hasVideo = computed(() => !!videoUrl.value)
const hasResult = computed(() => !!markdownContent.value)
const isAnalyzing = computed(() => analysisStatus.value === 'analyzing')

export function useVideoAnalysis() {
  function setApiKey(key: string) {
    apiKey.value = key
    localStorage.setItem('dashscope_api_key', key)
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
    apiKey,
    hasVideo,
    hasResult,
    isAnalyzing,
    setApiKey,
    resetAnalysis,
    resetAll,
  }
}
