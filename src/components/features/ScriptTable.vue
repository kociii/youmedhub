<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'
import { Download, Copy, FileText, History } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MarkdownIt from 'markdown-it'

const store = useAnalysisStore()
const { rawResponse, isAnalyzing } = storeToRefs(store)
const scrollContainer = ref<HTMLElement | null>(null)
const md = new MarkdownIt()

const viewMode = ref<'result' | 'history'>('result')

const renderedContent = computed(() => {
  if (!rawResponse.value) return ''
  try {
    return md.render(rawResponse.value)
  } catch (e) {
    return rawResponse.value
  }
})

watch(rawResponse, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
})
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
    <div class="p-4 border-b border-gray-200 flex justify-between items-center">
      <div class="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          :class="viewMode === 'result' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'"
          @click="viewMode = 'result'"
        >
          <FileText class="w-4 h-4 mr-2" />
          分析结果
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="viewMode === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'"
          @click="viewMode = 'history'"
        >
          <History class="w-4 h-4 mr-2" />
          历史记录
        </Button>
      </div>
      <div v-if="viewMode === 'result'" class="flex gap-2">
        <Button variant="outline" size="sm" class="gap-2">
          <Copy class="w-4 h-4" />
          复制全部
        </Button>
        <Button variant="outline" size="sm" class="gap-2">
          <Download class="w-4 h-4" />
          导出 Excel
        </Button>
      </div>
    </div>

    <div v-if="viewMode === 'result'" class="flex-1 overflow-auto p-4" ref="scrollContainer">
      <div v-if="!rawResponse" class="text-center text-gray-400 py-8">
        暂无分析数据，请先开始分析
      </div>
      <div v-else class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-2">AI 原始返回内容：</h3>
        <div class="prose prose-sm max-w-none text-gray-800" v-html="renderedContent"></div>
      </div>
    </div>

    <div v-else class="flex-1 overflow-auto p-4">
      <div class="text-center text-gray-400 py-8">
        历史记录功能开发中...
      </div>
    </div>
  </div>
</template>
