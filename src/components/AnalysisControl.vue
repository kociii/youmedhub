<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { analyzeVideo } from '@/api/videoAnalysis'
import { MODELS_BY_PROVIDER } from '@/config/models'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Play } from 'lucide-vue-next'

const {
  videoUrl,
  analysisStatus,
  markdownContent,
  scriptItems,
  tokenUsage,
  selectedModel,
  currentApiKey,
  hasVideo,
  isAnalyzing,
  viewMode,
  setSelectedModel,
} = useVideoAnalysis()

const errorMessage = ref('')

// 默认选择第一个模型
const defaultModelId = ref(MODELS_BY_PROVIDER.aliyun[0].id)

// 当前选中的模型 ID
const currentModelId = computed({
  get: () => selectedModel.value?.id || defaultModelId.value,
  set: (id: string) => {
    // 查找模型配置
    const allModels = [...MODELS_BY_PROVIDER.aliyun, ...MODELS_BY_PROVIDER.volcengine]
    const model = allModels.find(m => m.id === id)
    if (model) {
      setSelectedModel(model)
      defaultModelId.value = id
    }
  },
})

// 获取当前模型的 API Key 提示
const apiKeyPlaceholder = computed(() => {
  const model = selectedModel.value
  if (!model) return '请先选择模型'
  return model.provider === 'aliyun'
    ? '需要阿里百炼 API Key'
    : '需要火山引擎 API Key'
})

async function startAnalysis() {
  if (!selectedModel.value) {
    errorMessage.value = '请先选择模型'
    return
  }

  if (!currentApiKey.value) {
    errorMessage.value = apiKeyPlaceholder.value
    return
  }

  analysisStatus.value = 'analyzing'
  markdownContent.value = ''
  scriptItems.value = []
  tokenUsage.value = null
  errorMessage.value = ''
  viewMode.value = 'markdown'

  try {
    const result = await analyzeVideo(
      videoUrl.value,
      currentApiKey.value,
      selectedModel.value.id as any,
      undefined,
      undefined,
      (chunk) => {
        markdownContent.value += chunk
      },
      (usage) => {
        tokenUsage.value = usage
      },
    )
    scriptItems.value = result.rep
    analysisStatus.value = 'success'
    viewMode.value = 'table'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '分析失败，请重试'
    console.error('分析失败:', e)
    analysisStatus.value = 'error'
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 模型选择 -->
    <div class="space-y-2">
      <label class="text-sm font-medium">选择模型</label>
      <Select v-model="currentModelId" :disabled="isAnalyzing">
        <SelectTrigger>
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          <!-- 阿里百炼组 -->
          <SelectGroup>
            <SelectLabel>阿里百炼</SelectLabel>
            <SelectItem
              v-for="model in MODELS_BY_PROVIDER.aliyun"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </SelectItem>
          </SelectGroup>
          <!-- 火山引擎组 -->
          <SelectGroup>
            <SelectLabel>火山引擎</SelectLabel>
            <SelectItem
              v-for="model in MODELS_BY_PROVIDER.volcengine"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <!-- API Key 状态提示 -->
    <div v-if="!currentApiKey" class="rounded-md bg-muted p-3 text-xs text-muted-foreground">
      {{ apiKeyPlaceholder }}
    </div>

    <!-- 开始分析按钮 -->
    <Button
      variant="default"
      class="w-full"
      :disabled="!hasVideo || isAnalyzing || !currentApiKey"
      @click="startAnalysis"
    >
      <Loader2 v-if="isAnalyzing" class="mr-2 h-4 w-4 animate-spin" />
      <Play v-else class="mr-2 h-4 w-4" />
      {{ isAnalyzing ? '分析中...' : '开始分析' }}
    </Button>

    <!-- 错误提示 -->
    <div v-if="analysisStatus === 'error'" class="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
      {{ errorMessage }}
    </div>
  </div>
</template>
