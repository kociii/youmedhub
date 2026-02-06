<script setup lang="ts">
import { ref } from 'vue'
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
const activated = ref(false)

function toggle() {
  if (!activated.value) {
    activated.value = true
    // 等待 video 元素渲染后再播放
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        play()
      })
    })
    return
  }

  const video = videoRef.value
  if (!video) return

  if (playing.value) {
    video.pause()
    playing.value = false
  } else {
    play()
  }
}

function play() {
  const video = videoRef.value
  if (!video) return
  video.currentTime = parseTimeToSeconds(props.startTime)
  video.play()
  playing.value = true
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
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <video
      v-if="activated"
      ref="videoRef"
      :src="src"
      class="h-20 w-32 rounded object-cover"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @ended="playing = false"
    />
    <div v-else class="flex h-20 w-32 items-center justify-center rounded bg-muted">
      <Play class="h-6 w-6 text-muted-foreground" />
    </div>
    <Button variant="outline" size="sm" class="h-6 text-xs" @click="toggle">
      <Pause v-if="playing" class="mr-1 h-3 w-3" />
      <Play v-else class="mr-1 h-3 w-3" />
      {{ startTime }}-{{ endTime }}
    </Button>
  </div>
</template>
