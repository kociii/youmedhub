<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { analyzeVideo } from '@/api/videoAnalysis'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, Play } from 'lucide-vue-next'

const {
  videoUrl, apiKey, analysisStatus, markdownContent,
  scriptItems, tokenUsage, hasVideo, isAnalyzing,
} = useVideoAnalysis()

const errorMessage = ref('')

async function startAnalysis() {
  analysisStatus.value = 'analyzing'
  markdownContent.value = ''
  scriptItems.value = []
  tokenUsage.value = null
  errorMessage.value = ''

  try {
    const result = await analyzeVideo(
      videoUrl.value,
      apiKey.value,
      'qwen3-vl-flash',
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
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '分析失败，请重试'
    console.error('分析失败:', e)
    analysisStatus.value = 'error'
  }
}
</script>

<template>
  <Card class="space-y-3 p-4">
    <Button
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

    <div v-if="tokenUsage" class="flex flex-wrap gap-2">
      <Badge variant="secondary" class="text-xs">
        输入 {{ tokenUsage.prompt_tokens.toLocaleString() }}
      </Badge>
      <Badge variant="secondary" class="text-xs">
        输出 {{ tokenUsage.completion_tokens.toLocaleString() }}
      </Badge>
    </div>
  </Card>
</template>
