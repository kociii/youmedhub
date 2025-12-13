<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysis'
import { storeToRefs } from 'pinia'

const store = useAnalysisStore()
const { videoUrl } = storeToRefs(store)

const videoRef = ref<HTMLVideoElement | null>(null)

const seekTo = (time: number) => {
  if (videoRef.value) {
    videoRef.value.currentTime = time
  }
}

defineExpose({ seekTo })
</script>

<template>
  <div class="relative w-full max-h-[50vh] bg-black rounded-lg overflow-hidden flex items-center justify-center">
    <video
      v-if="videoUrl"
      ref="videoRef"
      :src="videoUrl"
      controls
      class="max-w-full max-h-[50vh] object-contain"
    ></video>
    <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
      暂无视频预览
    </div>
  </div>
</template>
