<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { parseTimeToSeconds } from '@/utils/videoCapture'

const props = defineProps<{
  src: string
  startTime: string
  endTime: string
  playAudio?: boolean
}>()

const videoRef = ref<HTMLVideoElement | null>(null)

onMounted(() => {
  const video = videoRef.value
  if (video) {
    video.currentTime = parseTimeToSeconds(props.startTime)
  }
})

function play() {
  const video = videoRef.value
  if (!video) return
  video.muted = !props.playAudio
  video.currentTime = parseTimeToSeconds(props.startTime)
  video.play().catch(() => {})
}

function stop() {
  const video = videoRef.value
  if (!video) return
  video.pause()
  video.muted = true
  video.currentTime = parseTimeToSeconds(props.startTime)
}

function onTimeUpdate() {
  const video = videoRef.value
  if (!video) return

  const endSec = parseTimeToSeconds(props.endTime)
  if (video.currentTime >= endSec) {
    video.pause()
    video.currentTime = parseTimeToSeconds(props.startTime)
  }
}
</script>

<template>
  <div
    class="flex items-center justify-center"
    @mouseenter="play"
    @mouseleave="stop"
  >
    <div
      v-if="!src"
      class="flex h-20 w-full items-center justify-center rounded border border-dashed text-xs text-muted-foreground"
    >
      当前来源不支持预览
    </div>
    <video
      v-else
      ref="videoRef"
      :src="src"
      class="max-h-[260px] w-full rounded object-contain"
      preload="metadata"
      :muted="!playAudio"
      @timeupdate="onTimeUpdate"
    />
  </div>
</template>
