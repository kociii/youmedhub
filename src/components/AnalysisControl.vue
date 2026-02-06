<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { analyzeVideo } from '@/api/videoAnalysis'
import type { AIModel } from '@/api/videoAnalysis'
import { Button } from '@/components/ui/button'
import { Loader2, Play } from 'lucide-vue-next'

const {
  videoUrl, apiKey, analysisStatus, markdownContent,
  scriptItems, tokenUsage, hasVideo, isAnalyzing, viewMode,
} = useVideoAnalysis()

const selectedModel = ref<AIModel>('qwen3-vl-flash')
const errorMessage = ref('')

async function startAnalysis() {
  analysisStatus.value = 'analyzing'
  markdownContent.value = ''
  scriptItems.value = []
  tokenUsage.value = null
  errorMessage.value = ''
  viewMode.value = 'markdown'

  try {
    const result = await analyzeVideo(
      videoUrl.value,
      apiKey.value,
      selectedModel.value,
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
  <div class="space-y-2">
    <select
      v-model="selectedModel"
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      :disabled="isAnalyzing"
    >
      <option value="qwen3-vl-flash">qwen3-vl-flash</option>
      <option value="qwen3-vl-plus">qwen3-vl-plus</option>
    </select>

    <Button
      variant="outline"
      class="w-full"
      :disabled="!hasVideo || isAnalyzing || !apiKey"
      @click="startAnalysis"
    >
      <Loader2 v-if="isAnalyzing" class="mr-2 h-4 w-4 animate-spin" />
      <Play v-else class="mr-2 h-4 w-4" />
      {{ isAnalyzing ? '分析中...' : '开始分析' }}
    </Button>

    <div v-if="analysisStatus === 'error'" class="text-xs text-destructive">
      {{ errorMessage }}
    </div>
  </div>
</template>
