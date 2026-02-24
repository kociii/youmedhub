<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useAuth } from '@/composables/useAuth'
import { analyzeVideo, type AIModel } from '@/api/videoAnalysis'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Play, Brain } from 'lucide-vue-next'
import AuthDialog from '@/components/AuthDialog.vue'

// 获取全局状态
const va = useVideoAnalysis()
const auth = useAuth()

// 登录弹窗
const showAuthDialog = ref(false)

// 本地计算属性，用于 template 绑定
const enableThinkingModel = computed({
  get: () => va.enableThinking.value,
  set: (val: boolean) => { va.enableThinking.value = val }
})

const isAnalyzing = computed(() => va.isAnalyzing.value)
const hasVideo = computed(() => va.hasVideo.value)
const hasApiKey = computed(() => !!va.currentApiKey.value)
const isError = computed(() => va.analysisStatus.value === 'error')

const errorMessage = ref('')

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

  va.analysisStatus.value = 'analyzing'
  va.markdownContent.value = ''
  va.scriptItems.value = []
  va.tokenUsage.value = null
  errorMessage.value = ''
  va.thinkingContent.value = ''
  va.isThinking.value = false
  va.viewMode.value = 'markdown'

  try {
    const result = await analyzeVideo(
      va.videoUrl.value,
      va.currentApiKey.value,
      (va.selectedModel.value?.id || 'qwen3.5-plus') as AIModel,
      undefined,
      undefined,
      (chunk) => {
        va.markdownContent.value += chunk
      },
      (usage) => {
        va.tokenUsage.value = usage
      },
      {
        temperature: va.analysisParams.value.temperature,
        top_p: va.analysisParams.value.top_p,
        frequency_penalty: va.analysisParams.value.frequency_penalty,
        presence_penalty: va.analysisParams.value.presence_penalty,
        enableThinking: va.enableThinking.value,
      },
      (chunk) => {
        va.thinkingContent.value += chunk
        va.isThinking.value = true
      },
    )
    va.scriptItems.value = result.rep
    va.analysisStatus.value = 'success'
    va.isThinking.value = false
    va.viewMode.value = 'table'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '分析失败，请重试'
    console.error('分析失败:', e)
    va.analysisStatus.value = 'error'
    va.isThinking.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 思考模式开关 -->
    <div class="flex items-center justify-between rounded-lg border p-3">
      <div class="flex items-center gap-2">
        <Brain class="h-4 w-4 text-muted-foreground" />
        <div>
          <Label for="thinking-mode" class="text-sm font-medium cursor-pointer">思考模式</Label>
          <p class="text-xs text-muted-foreground">启用后模型会先思考再回答</p>
        </div>
      </div>
      <Switch
        id="thinking-mode"
        v-model:checked="enableThinkingModel"
        :disabled="isAnalyzing"
      />
    </div>

    <!-- 登录提示 -->
    <div v-if="!auth.isAuthenticated.value" class="rounded-md bg-amber-500/10 p-3 text-xs text-amber-600">
      请先登录后再进行分析
    </div>

    <!-- API Key 状态提示 -->
    <div v-if="!hasApiKey" class="rounded-md bg-muted p-3 text-xs text-muted-foreground">
      请先配置阿里百炼 API Key
    </div>

    <!-- 开始分析按钮 -->
    <Button
      variant="default"
      class="w-full"
      :disabled="!hasVideo || isAnalyzing || !hasApiKey"
      @click="startAnalysis"
    >
      <Loader2 v-if="isAnalyzing" class="mr-2 h-4 w-4 animate-spin" />
      <Play v-else class="mr-2 h-4 w-4" />
      {{ isAnalyzing ? '分析中...' : '开始分析' }}
    </Button>

    <!-- 错误提示 -->
    <div v-if="isError" class="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
      {{ errorMessage }}
    </div>

    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="showAuthDialog" />
  </div>
</template>
