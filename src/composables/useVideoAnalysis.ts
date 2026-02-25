import { ref, computed } from 'vue'
import type {
  VideoScriptItem,
  AnalysisStatus,
  TokenUsage,
  ScriptCandidate,
  GenerationInputSnapshot,
} from '@/types/video'
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, type ModelConfig } from '@/config/models'
import type { AnalysisMode } from '@/prompts/videoAnalysis'

const videoFile = ref<File | null>(null)
const videoUrl = ref('')
const localVideoUrl = ref('') // 本地预览 URL（object URL）
const uploadProgress = ref(0)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')

// 图片文件（用于参考生成模式）- 支持多张
const imageFiles = ref<File[]>([])
const imageUrls = ref<string[]>([])
const localImageUrls = ref<string[]>([]) // 本地预览 URL（object URL）

// 待引用的参考脚本（从分析结果跳转过来时使用）
const pendingReference = ref('')

const analysisStatus = ref<AnalysisStatus>('idle')
const markdownContent = ref('')
const scriptItems = ref<VideoScriptItem[]>([])
const tokenUsage = ref<TokenUsage | null>(null)
const scriptCandidates = ref<ScriptCandidate[]>([])
const activeScriptCandidateId = ref('')
const generationInputSnapshot = ref<GenerationInputSnapshot | null>(null)

const viewMode = ref<'markdown' | 'table'>('table')

// 分析模式
const analysisMode = ref<AnalysisMode>('analyze')

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

// 思考模式开关（默认关闭）
const enableThinking = ref(false)

// 思考内容状态
const thinkingContent = ref('')
const isThinking = ref(false)

// 配置栏是否展开（创建模式下开始生成前展开，生成后收起）
const isConfigPanelExpanded = ref(true)

const hasVideo = computed(() => !!videoFile.value || !!videoUrl.value)
const hasResult = computed(() => !!markdownContent.value)
const isAnalyzing = computed(() => analysisStatus.value === 'analyzing')
const needsUpload = computed(() => !!videoFile.value && !videoUrl.value)
const activeScriptCandidate = computed(() =>
  scriptCandidates.value.find(candidate => candidate.id === activeScriptCandidateId.value) || null
)
const hasMultipleScriptCandidates = computed(() => scriptCandidates.value.length > 1)

// 可用的视频预览 URL（优先本地，其次远程）
const previewUrl = computed(() => localVideoUrl.value || videoUrl.value)

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

  function setAnalysisMode(mode: AnalysisMode) {
    analysisMode.value = mode
  }

  // 设置待引用的参考脚本
  function setPendingReference(script: string) {
    pendingReference.value = script
  }

  // 清除待引用的参考脚本
  function clearPendingReference() {
    pendingReference.value = ''
  }

  function setGenerationInputSnapshot(snapshot: GenerationInputSnapshot) {
    generationInputSnapshot.value = snapshot
  }

  function clearGenerationInputSnapshot() {
    generationInputSnapshot.value = null
  }

  function setScriptCandidates(candidates: ScriptCandidate[]) {
    scriptCandidates.value = candidates

    if (candidates.length === 0) {
      activeScriptCandidateId.value = ''
      markdownContent.value = ''
      scriptItems.value = []
      tokenUsage.value = null
      return
    }

    const firstCandidate = candidates[0]
    activeScriptCandidateId.value = firstCandidate.id
    markdownContent.value = firstCandidate.markdown
    scriptItems.value = firstCandidate.scriptData
    tokenUsage.value = firstCandidate.tokenUsage
    viewMode.value = 'table'
  }

  function appendScriptCandidate(candidate: ScriptCandidate) {
    scriptCandidates.value.push(candidate)

    if (!activeScriptCandidateId.value) {
      activeScriptCandidateId.value = candidate.id
      markdownContent.value = candidate.markdown
      scriptItems.value = candidate.scriptData
      tokenUsage.value = candidate.tokenUsage
    }
  }

  function setActiveScriptCandidate(candidateId: string) {
    const candidate = scriptCandidates.value.find(item => item.id === candidateId)
    if (!candidate) return

    activeScriptCandidateId.value = candidate.id
    markdownContent.value = candidate.markdown
    scriptItems.value = candidate.scriptData
    tokenUsage.value = candidate.tokenUsage
  }

  function updateActiveScriptItems(items: VideoScriptItem[]) {
    scriptItems.value = items

    if (!activeScriptCandidateId.value) return
    const index = scriptCandidates.value.findIndex(item => item.id === activeScriptCandidateId.value)
    if (index === -1) return

    const current = scriptCandidates.value[index]
    scriptCandidates.value[index] = {
      ...current,
      scriptData: items,
    }
  }

  function updateScriptItemsByCandidateId(candidateId: string, items: VideoScriptItem[]) {
    const index = scriptCandidates.value.findIndex(item => item.id === candidateId)
    if (index === -1) return

    const current = scriptCandidates.value[index]
    scriptCandidates.value[index] = {
      ...current,
      scriptData: items,
    }

    if (activeScriptCandidateId.value === candidateId) {
      scriptItems.value = items
    }
  }

  function resetAnalysis() {
    analysisStatus.value = 'idle'
    markdownContent.value = ''
    scriptItems.value = []
    tokenUsage.value = null
    scriptCandidates.value = []
    activeScriptCandidateId.value = ''
    generationInputSnapshot.value = null
    thinkingContent.value = ''
    isThinking.value = false
    isConfigPanelExpanded.value = true // 重置时展开配置栏
    // 清除图片
    clearImageFiles()
  }

  // 收起配置栏（生成成功后调用）
  function collapseConfigPanel() {
    isConfigPanelExpanded.value = false
  }

  // 释放本地预览 URL
  function revokeLocalVideoUrl() {
    if (localVideoUrl.value) {
      URL.revokeObjectURL(localVideoUrl.value)
      localVideoUrl.value = ''
    }
  }

  function resetAll() {
    revokeLocalVideoUrl()
    videoFile.value = null
    videoUrl.value = ''
    uploadProgress.value = 0
    uploadStatus.value = 'idle'
    resetAnalysis()
  }

  // 清除视频文件（保留其他状态）
  function clearVideoFile() {
    revokeLocalVideoUrl()
    videoFile.value = null
    uploadStatus.value = 'idle'
    uploadProgress.value = 0
  }

  // 清除图片文件
  function clearImageFiles() {
    for (const url of localImageUrls.value) {
      URL.revokeObjectURL(url)
    }
    localImageUrls.value = []
    imageFiles.value = []
    imageUrls.value = []
  }

  // 添加图片
  function addImageFile(file: File) {
    const localUrl = URL.createObjectURL(file)
    imageFiles.value.push(file)
    localImageUrls.value.push(localUrl)
  }

  // 移除单张图片
  function removeImageFile(index: number) {
    if (index >= 0 && index < localImageUrls.value.length) {
      URL.revokeObjectURL(localImageUrls.value[index])
    }
    imageFiles.value.splice(index, 1)
    localImageUrls.value.splice(index, 1)
    imageUrls.value.splice(index, 1)
  }

  return {
    videoFile,
    videoUrl,
    localVideoUrl,
    previewUrl,
    uploadProgress,
    uploadStatus,
    imageFiles,
    imageUrls,
    localImageUrls,
    pendingReference,
    analysisStatus,
    markdownContent,
    scriptItems,
    tokenUsage,
    scriptCandidates,
    activeScriptCandidateId,
    activeScriptCandidate,
    hasMultipleScriptCandidates,
    generationInputSnapshot,
    viewMode,
    analysisMode,
    selectedModel,
    enableThinking,
    thinkingContent,
    isThinking,
    isConfigPanelExpanded,
    dashscopeApiKey,
    currentApiKey,
    hasVideo,
    hasResult,
    isAnalyzing,
    hasValidApiKey,
    needsUpload,
    setDashscopeApiKey,
    setSelectedModel,
    setAnalysisMode,
    setPendingReference,
    clearPendingReference,
    setGenerationInputSnapshot,
    clearGenerationInputSnapshot,
    setScriptCandidates,
    appendScriptCandidate,
    setActiveScriptCandidate,
    updateActiveScriptItems,
    updateScriptItemsByCandidateId,
    resetAnalysis,
    resetAll,
    clearVideoFile,
    clearImageFiles,
    addImageFile,
    removeImageFile,
    revokeLocalVideoUrl,
    collapseConfigPanel,
  }
}
