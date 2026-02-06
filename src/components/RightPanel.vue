<script setup lang="ts">
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import ResultToolbar from '@/components/ResultToolbar.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import ScriptTable from '@/components/ScriptTable.vue'

const { viewMode, hasResult } = useVideoAnalysis()
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <!-- 右侧上方工具栏 -->
    <ResultToolbar />

    <!-- 内容区 -->
    <div class="flex-1 overflow-auto p-4">
      <template v-if="hasResult">
        <MarkdownView v-if="viewMode === 'markdown'" />
        <ScriptTable v-else />
      </template>
      <div v-else class="flex h-full items-center justify-center">
        <div class="text-center text-muted-foreground">
          <p class="text-lg">请先上传视频文件</p>
          <p class="mt-1 text-sm">支持 mp4、mov 格式，大小 ≤100MB / 时长 ≤10 分钟</p>
        </div>
      </div>
    </div>
  </div>
</template>
