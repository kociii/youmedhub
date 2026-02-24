<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import VideoUploader from '@/components/VideoUploader.vue'
import VideoPreview from '@/components/VideoPreview.vue'
import AnalysisControl from '@/components/AnalysisControl.vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'

const route = useRoute()
const { hasVideo } = useVideoAnalysis()

// 根据路由显示对应的功能名称
const panelTitle = computed(() => {
  const titles: Record<string, string> = {
    analyze: '视频脚本解析',
    create: '脚本生成',
  }
  return titles[route.name as string] || '配置'
})
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto p-4">
    <!-- 标题 -->
    <h2 class="text-lg font-semibold">{{ panelTitle }}</h2>

    <!-- 视频上传/预览区 -->
    <VideoPreview v-if="hasVideo" />
    <VideoUploader v-else />

    <!-- 分析控制 -->
    <AnalysisControl />
  </div>
</template>
