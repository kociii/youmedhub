<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import ResultToolbar from '@/components/ResultToolbar.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import ScriptTable from '@/components/ScriptTable.vue'
import ThinkingPanel from '@/components/ThinkingPanel.vue'

const route = useRoute()
const va = useVideoAnalysis()

const emptyState = computed(() => {
  if (route.name === 'create') {
    return {
      title: '请先填写创作需求',
      description: '支持文字描述，并可补充参考图片或参考脚本',
    }
  }

  return {
    title: '请先上传视频文件',
    description: '支持 mp4、mov 格式，大小 ≤100MB / 时长 ≤10 分钟',
  }
})
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <!-- 右侧上方工具栏 -->
    <ResultToolbar />

    <!-- 内容区 -->
    <div class="flex-1 overflow-auto p-4">
      <!-- 思考面板 -->
      <ThinkingPanel class="mb-4" />

      <template v-if="va.hasResult.value">
        <MarkdownView v-if="va.viewMode.value === 'markdown'" />
        <ScriptTable v-else />
      </template>
      <div v-else class="flex h-full items-center justify-center">
        <div class="text-center text-muted-foreground">
          <p class="text-lg">{{ emptyState.title }}</p>
          <p class="mt-1 text-sm">{{ emptyState.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
