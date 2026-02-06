<script setup lang="ts">
import VideoUploader from '@/components/VideoUploader.vue'
import VideoPreview from '@/components/VideoPreview.vue'
import AnalysisControl from '@/components/AnalysisControl.vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'

const { hasVideo } = useVideoAnalysis()
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto p-4">
    <!-- 视频上传/预览区 -->
    <VideoPreview v-if="hasVideo" />
    <VideoUploader v-else />

    <!-- 分析控制 -->
    <AnalysisControl />
  </div>
</template>
