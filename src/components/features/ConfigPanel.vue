<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'
import { Sparkles, Loader2 } from 'lucide-vue-next'

const store = useAnalysisStore()
const { isAnalyzing, progress, videoUrl } = storeToRefs(store)

const prompt = ref('请详细分析视频的视觉内容、音频信息和脚本结构，生成分镜脚本。')
const selectedModel = ref('gpt-4o')

const handleAnalyze = () => {
  store.startAnalysis()
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
    <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <Sparkles class="w-5 h-5 text-blue-500" />
      分析配置
    </h2>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">分析提示词</label>
        <textarea
          v-model="prompt"
          rows="4"
          class="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          placeholder="输入具体的分析要求..."
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">AI 模型</label>
        <select
          v-model="selectedModel"
          class="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <option value="gpt-4o">GPT-4o (推荐)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
        </select>
      </div>

      <div class="pt-2">
        <Button 
          class="w-full gap-2" 
          :disabled="!videoUrl || isAnalyzing"
          @click="handleAnalyze"
        >
          <Loader2 v-if="isAnalyzing" class="w-4 h-4 animate-spin" />
          <span v-if="isAnalyzing">分析中 {{ progress }}%</span>
          <span v-else>开始智能分析</span>
        </Button>
        <p v-if="!videoUrl" class="text-xs text-red-400 text-center mt-2">
          请先上传视频
        </p>
      </div>
    </div>
  </div>
</template>
