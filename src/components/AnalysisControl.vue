<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useAuth } from '@/composables/useAuth'
import { analyzeVideo, type AIModel } from '@/api/videoAnalysis'
import { uploadToTemporaryFile } from '@/api/temporaryFile'
import { AVAILABLE_MODELS } from '@/config/models'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Brain } from 'lucide-vue-next'
import AuthDialog from '@/components/AuthDialog.vue'

// 获取全局状态
const va = useVideoAnalysis()
const auth = useAuth()

// 登录弹窗
const showAuthDialog = ref(false)

// 上传状态
const isUploading = ref(false)
const uploadProgress = ref(0)

// 模型选择
const selectedModelId = computed({
  get: () => va.selectedModel.value?.id || 'qwen3.5-flash',
  set: (val: string) => {
    const model = AVAILABLE_MODELS.find(m => m.id === val)
    if (model) {
      va.setSelectedModel(model)
    }
  }
})

// 思考模式开关
const enableThinking = computed({
  get: () => va.enableThinking.value,
  set: (val: boolean) => {
    va.enableThinking.value = val
  }
})

const isAnalyzing = computed(() => va.isAnalyzing.value)
const hasApiKey = computed(() => !!va.currentApiKey.value)
const isError = computed(() => va.analysisStatus.value === 'error')
const isProcessing = computed(() => isUploading.value || isAnalyzing.value)

const errorMessage = ref('')

// 上传视频
async function uploadVideo(): Promise<string> {
  if (!va.videoFile.value) {
    throw new Error('请先选择视频')
  }

  isUploading.value = true
  uploadProgress.value = 0
  va.uploadStatus.value = 'uploading'

  try {
    const result = await uploadToTemporaryFile(va.videoFile.value, (loaded, total) => {
      uploadProgress.value = total > 0 ? Math.round((loaded / total) * 100) : 0
    })
    va.videoUrl.value = result.downloadLink
    va.uploadStatus.value = 'success'
    // 上传完成后释放本地预览 URL，使用远程 URL
    va.revokeLocalVideoUrl()
    return result.downloadLink
  } catch (e) {
    va.uploadStatus.value = 'error'
    throw new Error(e instanceof Error ? e.message : '上传失败')
  } finally {
    isUploading.value = false
  }
}

async function startAnalysis() {
  // 检查登录状态
  if (!auth.isAuthenticated.value) {
    showAuthDialog.value = true
    return
  }

  if (!va.currentApiKey.value) {
    errorMessage.value = '请先配置阿里百炼 API Key'
    return
  }

  // 重置状态
  errorMessage.value = ''
  va.thinkingContent.value = ''
  va.isThinking.value = false

  try {
    // 1. 如果需要上传，先上传视频
    let videoUrl = va.videoUrl.value
    if (va.needsUpload.value) {
      videoUrl = await uploadVideo()
    }

    // 2. 开始分析
    va.analysisStatus.value = 'analyzing'
    va.markdownContent.value = ''
    va.scriptItems.value = []
    va.tokenUsage.value = null
    va.viewMode.value = 'markdown'

    // 调试日志
    console.log('[startAnalysis] enableThinking:', va.enableThinking.value)

    const result = await analyzeVideo({
      source: videoUrl,
      apiKey: va.currentApiKey.value,
      model: (va.selectedModel.value?.id || 'qwen3.5-flash') as AIModel,
      mode: 'analyze',
      onStream: (chunk) => {
        va.markdownContent.value += chunk
      },
      onTokenUsage: (usage) => {
        va.tokenUsage.value = usage
      },
      params: {
        enableThinking: va.enableThinking.value,
      },
      onReasoning: (chunk) => {
        va.thinkingContent.value += chunk
        va.isThinking.value = true
      },
    })
    va.scriptItems.value = result.rep
    va.analysisStatus.value = 'success'
    va.isThinking.value = false
    va.viewMode.value = 'table'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '操作失败，请重试'
    console.error('操作失败:', e)
    va.analysisStatus.value = 'error'
    va.isThinking.value = false
  }
}

// 暴露给父组件
defineExpose({
  startAnalysis,
  isUploading,
})
</script>

<template>
  <div class="space-y-4">
    <!-- 模型选择 + 思考模式（一行，各占 50%） -->
    <div class="flex items-center gap-3">
      <!-- 模型选择 -->
      <Select v-model="selectedModelId" :disabled="isProcessing" class="flex-1">
        <SelectTrigger class="h-8 w-full">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent class="max-w-[50vw]">
          <SelectItem
            v-for="model in AVAILABLE_MODELS"
            :key="model.id"
            :value="model.id"
          >
            {{ model.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- 思考模式按钮 -->
      <Button
        variant="outline"
        size="sm"
        class="h-8 gap-1.5 px-3 flex-1"
        :class="enableThinking && 'bg-purple-100 border-purple-300 hover:bg-purple-200'"
        :disabled="isProcessing"
        @click="enableThinking = !enableThinking"
      >
        <Brain class="h-4 w-4 text-purple-500" />
        <span class="text-purple-700">思考</span>
      </Button>
    </div>

    <!-- 登录提示 -->
    <div v-if="!auth.isAuthenticated.value" class="rounded-md bg-amber-500/10 p-3 text-xs text-amber-600">
      请先登录后再进行分析
    </div>

    <!-- API Key 状态提示 -->
    <div v-if="!hasApiKey" class="rounded-md bg-muted p-3 text-xs text-muted-foreground">
      请先配置阿里百炼 API Key
    </div>

    <!-- 上传进度 -->
    <div v-if="isUploading" class="space-y-2">
      <div class="flex items-center gap-2 text-sm">
        <Upload class="h-4 w-4 text-muted-foreground" />
        <span>正在上传视频...</span>
      </div>
      <Progress :model-value="uploadProgress" class="w-full" />
      <p class="text-xs text-muted-foreground text-center">{{ uploadProgress }}%</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="isError" class="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
      {{ errorMessage }}
    </div>

    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="showAuthDialog" />
  </div>
</template>
