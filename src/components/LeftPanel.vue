<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { buildPromptByMode, generateScript, type AIModel } from '@/api/videoAnalysis'
import { uploadToTemporaryFile } from '@/api/temporaryFile'
import VideoUploader from '@/components/VideoUploader.vue'
import VideoPreview from '@/components/VideoPreview.vue'
import AnalysisControl from '@/components/AnalysisControl.vue'
import CreateModePanel from '@/components/CreateModePanel.vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Play, Scissors } from 'lucide-vue-next'
import AuthDialog from '@/components/AuthDialog.vue'
import type { ScriptCandidate, TokenUsage } from '@/types/video'

interface GenerateParams {
  videoType: string
  videoTypeLabel: string
  requirementText: string
  duration: string
  referenceScript?: string
  scriptCount: number
}

const route = useRoute()
const va = useVideoAnalysis()
const auth = useAuth()

const showAuthDialog = ref(false)
const generateErrorMessage = ref('')

const analysisControlRef = ref<InstanceType<typeof AnalysisControl> | null>(null)
const createModePanelRef = ref<InstanceType<typeof CreateModePanel> | null>(null)

const isAnalyzePage = computed(() => route.name === 'analyze')
const isCreatePage = computed(() => route.name === 'create')

watch(
  () => route.name,
  (name, oldName) => {
    if (name === 'analyze') va.setAnalysisMode('analyze')
    if (name === 'create') va.setAnalysisMode('create')

    if (
      (name === 'analyze' || name === 'create') &&
      (oldName === 'analyze' || oldName === 'create') &&
      name !== oldName
    ) {
      va.resetAnalysis()
    }
  },
  { immediate: true }
)

function handleStartAnalysis() {
  if (!auth.isAuthenticated.value) {
    showAuthDialog.value = true
    return
  }
  analysisControlRef.value?.startAnalysis()
}

function buildGenerateTopic(params: GenerateParams): string {
  return [
    `视频类型：${params.videoTypeLabel || params.videoType}`,
    `视频要求：`,
    params.requirementText,
  ].filter(Boolean).join('\n')
}

async function handleStartGenerate() {
  if (!auth.isAuthenticated.value) {
    showAuthDialog.value = true
    return
  }

  if (!va.currentApiKey.value) {
    generateErrorMessage.value = '请先配置阿里百炼 API Key'
    return
  }

  const params = createModePanelRef.value?.getParams() as GenerateParams | undefined
  if (!params || !params.videoType) {
    generateErrorMessage.value = '请先完善视频要求'
    return
  }

  generateErrorMessage.value = ''
  va.analysisStatus.value = 'analyzing'
  va.markdownContent.value = ''
  va.scriptItems.value = []
  va.tokenUsage.value = null
  va.setScriptCandidates([])
  va.viewMode.value = 'markdown'
  va.thinkingContent.value = ''
  va.isThinking.value = false

  try {
    // 上传多张图片（使用百炼临时存储，与模型绑定）
    const uploadedImageUrls: string[] = []
    const model = va.selectedModel.value?.id || 'qwen3.5-flash'
    for (let i = 0; i < va.imageFiles.value.length; i++) {
      const file = va.imageFiles.value[i]
      if (!va.imageUrls.value[i]) {
        const uploadResult = await uploadToTemporaryFile(file, model)
        va.imageUrls.value[i] = uploadResult.downloadLink
      }
      uploadedImageUrls.push(va.imageUrls.value[i])
    }

    const hasReferenceScript = !!params.referenceScript?.trim()
    va.setAnalysisMode(hasReferenceScript ? 'reference' : 'create')
    va.setGenerationInputSnapshot({
      videoType: params.videoTypeLabel || params.videoType,
      requirementSummary: params.requirementText.slice(0, 200),
      duration: params.duration || undefined,
      scriptCount: params.scriptCount,
      hasImageInput: uploadedImageUrls.length > 0,
      hasReferenceScript,
      submittedAt: new Date().toISOString(),
    })

    const topic = buildGenerateTopic(params)

    // 调试日志
    console.log('[handleStartGenerate] enableThinking:', va.enableThinking.value)

    const commonOptions = {
      apiKey: va.currentApiKey.value,
      model: (va.selectedModel.value?.id || 'qwen3.5-flash') as AIModel,
      params: {
        enableThinking: va.enableThinking.value,
      },
      onReasoning: (chunk: string) => {
        va.thinkingContent.value += chunk
        va.isThinking.value = true
      },
    }

    // 并行生成多个脚本
    const generateTasks = Array.from({ length: params.scriptCount }, (_, i) => {
      let candidateMarkdown = ''
      let candidateTokenUsage: TokenUsage | null = null
      const variantHint = `\n\n# 候选方案要求\n当前为第 ${i + 1} 套候选脚本，请在叙事角度、镜头节奏或文案表达上与其他方案明显区分。`

      return {
        index: i,
        promise: hasReferenceScript
          ? generateScript({
            ...commonOptions,
            mode: 'reference',
            context: {
              topic,
              referenceScript: params.referenceScript || '',
            },
            customPrompt: buildPromptByMode('reference', {
              topic,
              referenceScript: params.referenceScript || '',
            }) + variantHint,
            onStream: (chunk: string) => {
              // 收到正式内容时，思考已完成
              va.isThinking.value = false
              candidateMarkdown += chunk
              if (i === 0 && !va.scriptCandidates.value.length) {
                va.markdownContent.value = candidateMarkdown
              }
            },
            onTokenUsage: (usage: TokenUsage) => {
              candidateTokenUsage = usage
              if (i === 0 && !va.scriptCandidates.value.length) {
                va.tokenUsage.value = usage
              }
            },
          })
          : generateScript({
            ...commonOptions,
            mode: 'create',
            context: {
              topic,
              duration: params.duration,
              imageUrls: uploadedImageUrls,
            },
            customPrompt: buildPromptByMode('create', {
              topic,
              duration: params.duration,
              imageUrls: uploadedImageUrls,
            }) + variantHint,
            onStream: (chunk: string) => {
              // 收到正式内容时，思考已完成
              va.isThinking.value = false
              candidateMarkdown += chunk
              if (i === 0 && !va.scriptCandidates.value.length) {
                va.markdownContent.value = candidateMarkdown
              }
            },
            onTokenUsage: (usage: TokenUsage) => {
              candidateTokenUsage = usage
              if (i === 0 && !va.scriptCandidates.value.length) {
                va.tokenUsage.value = usage
              }
            },
          }),
        getCandidateData: () => ({
          markdown: candidateMarkdown,
          tokenUsage: candidateTokenUsage,
        }),
      }
    })

    // 并行执行所有任务
    const results = await Promise.allSettled(generateTasks.map(t => t.promise))

    let successCount = 0
    const errorMessages: string[] = []

    results.forEach((result, i) => {
      const task = generateTasks[i]
      const { markdown, tokenUsage } = task.getCandidateData()

      if (result.status === 'fulfilled') {
        const candidate: ScriptCandidate = {
          id: `candidate_${Date.now()}_${i + 1}`,
          title: `方案 ${i + 1}`,
          markdown,
          scriptData: result.value.rep,
          tokenUsage,
        }
        va.appendScriptCandidate(candidate)
        successCount += 1
      } else {
        const message = result.reason instanceof Error ? result.reason.message : '生成失败'
        errorMessages.push(`方案 ${i + 1}：${message}`)
      }
    })

    // 重置思考状态
    va.isThinking.value = false

    if (successCount === 0) {
      throw new Error(errorMessages[0] || '生成失败，请重试')
    }

    va.analysisStatus.value = 'success'
    va.viewMode.value = 'table'
    va.collapseConfigPanel() // 生成成功后收起配置栏
    if (errorMessages.length > 0) {
      generateErrorMessage.value = `部分方案生成失败：${errorMessages.join('；')}`
    }
  } catch (e) {
    generateErrorMessage.value = e instanceof Error ? e.message : '生成失败，请重试'
    console.error('生成失败:', e)
    va.analysisStatus.value = 'error'
    va.isThinking.value = false
  }
}

const hasVideoProxy = computed(() => va.hasVideo.value)
const hasApiKeyProxy = computed(() => !!va.currentApiKey.value)
const isAnalyzingProxy = computed(() => va.isAnalyzing.value)
const isUploadingProxy = computed(() => analysisControlRef.value?.isUploading ?? false)
const isProcessingProxy = computed(() => isUploadingProxy.value || isAnalyzingProxy.value)
const canGenerateProxy = computed(() => createModePanelRef.value?.canGenerate ?? false)
</script>

<template>
  <div class="flex h-full flex-col">
    <template v-if="isAnalyzePage">
      <div class="flex-1 overflow-y-auto p-4">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label class="text-xs font-normal text-muted-foreground">上传视频</Label>
            <VideoPreview v-if="va.hasVideo.value" />
            <VideoUploader v-else />
          </div>

          <div class="space-y-2">
            <Label class="text-xs font-normal text-muted-foreground">模型选择</Label>
            <AnalysisControl ref="analysisControlRef" />
          </div>
        </div>
      </div>
      <div class="shrink-0 border-t p-4">
        <Button
          variant="default"
          class="w-full"
          :disabled="!hasVideoProxy || isProcessingProxy || !hasApiKeyProxy"
          @click="handleStartAnalysis"
        >
          <Loader2 v-if="isProcessingProxy" class="mr-2 h-4 w-4 animate-spin" />
          <Scissors v-else class="mr-2 h-4 w-4" />
          <template v-if="isUploadingProxy">上传中...</template>
          <template v-else-if="isAnalyzingProxy">分析中...</template>
          <template v-else>开始分析</template>
        </Button>
      </div>
    </template>

    <template v-else-if="isCreatePage">
      <div class="flex-1 overflow-y-auto p-4">
        <CreateModePanel ref="createModePanelRef" />
      </div>
      <div class="shrink-0 border-t p-4">
        <Button
          variant="default"
          class="w-full"
          :disabled="!canGenerateProxy || isProcessingProxy"
          @click="handleStartGenerate"
        >
          <Loader2 v-if="isProcessingProxy" class="mr-2 h-4 w-4 animate-spin" />
          <Play v-else class="mr-2 h-4 w-4" />
          <template v-if="isProcessingProxy">生成中...</template>
          <template v-else>开始生成</template>
        </Button>
        <p v-if="generateErrorMessage" class="mt-2 text-xs text-destructive">
          {{ generateErrorMessage }}
        </p>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-1 items-center justify-center">
        <p class="text-sm text-muted-foreground">请选择功能</p>
      </div>
    </template>

    <AuthDialog v-model:open="showAuthDialog" />
  </div>
</template>
