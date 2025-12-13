<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'

const store = useAnalysisStore()
const { videoUrl } = storeToRefs(store)
</script>

<template>
  <div class="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
    <video
      v-if="videoUrl"
      :src="videoUrl"
      controls
      class="w-full h-full object-contain"
    ></video>
    <div v-else class="w-full h-full flex items-center justify-center text-slate-500">
      暂无视频预览
    </div>
  </div>
</template>
