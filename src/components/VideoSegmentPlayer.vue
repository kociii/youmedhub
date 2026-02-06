<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-vue-next'
import { parseTimeToSeconds } from '@/utils/videoCapture'

const props = defineProps<{
  src: string
  startTime: string
  endTime: string
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const playing = ref(false)

function toggle() {
  const video = videoRef.value
  if (!video) return

  if (playing.value) {
    video.pause()
    playing.value = false
  } else {
    video.currentTime = parseTimeToSeconds(props.startTime)
    video.play()
    playing.value = true
  }
}

function onTimeUpdate() {
  const video = videoRef.value
  if (!video) return

  const endSec = parseTimeToSeconds(props.endTime)
  if (video.currentTime >= endSec) {
    video.pause()
    playing.value = false
  }
}

onMounted(() => {
  const video = videoRef.value
  if (video) {
    video.currentTime = parseTimeToSeconds(props.startTime)
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <video
      ref="videoRef"
      :src="src"
      class="h-20 w-32 rounded object-cover"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @ended="playing = false"
    />
    <Button variant="outline" size="sm" class="h-6 text-xs" @click="toggle">
      <Pause v-if="playing" class="mr-1 h-3 w-3" />
      <Play v-else class="mr-1 h-3 w-3" />
      {{ startTime }}-{{ endTime }}
    </Button>
  </div>
</template>
