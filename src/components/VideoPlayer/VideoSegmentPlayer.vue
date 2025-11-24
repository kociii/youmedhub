<template>
  <div 
    class="video-segment-player"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <video
      ref="videoRef"
      :src="videoUrl"
      class="segment-video"
      muted
      preload="metadata"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @error="handleError"
    ></video>
    
    <div v-if="error" class="error-overlay">
      <span>加载失败</span>
    </div>
    
    <div class="time-badge">{{ formatDuration(duration) }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  videoUrl: string;
  startTime: number;
  endTime: number;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
const error = ref(false);
let playPromise: Promise<void> | null = null; // 保存 play() 的 Promise

const duration = computed(() => Math.max(0, props.endTime - props.startTime));

const formatDuration = (seconds: number) => {
  return seconds.toFixed(1) + 's';
};

const handleLoadedMetadata = () => {
  if (videoRef.value) {
    videoRef.value.currentTime = props.startTime;
  }
};

const handleError = () => {
  error.value = true;
};

const handleTimeUpdate = () => {
  if (!videoRef.value) return;

  // 如果超过结束时间，循环播放
  if (videoRef.value.currentTime >= props.endTime) {
    videoRef.value.currentTime = props.startTime;
    if (isPlaying.value) {
      videoRef.value.play().catch((e) => {
        // 忽略 AbortError
        if (e.name !== 'AbortError') {
          console.error("循环播放失败", e);
        }
      });
    }
  }
};

const handleMouseEnter = async () => {
  if (videoRef.value && !error.value) {
    isPlaying.value = true;

    // 确保在范围内
    if (videoRef.value.currentTime < props.startTime || videoRef.value.currentTime >= props.endTime) {
      videoRef.value.currentTime = props.startTime;
    }

    try {
      // 保存 play() 的 Promise，以便在需要时可以等待它完成
      playPromise = videoRef.value.play();
      await playPromise;
      playPromise = null;
    } catch (e) {
      // 忽略 AbortError（被 pause() 中断）
      if ((e as Error).name !== 'AbortError') {
        console.error("播放失败", e);
      }
      playPromise = null;
    }
  }
};

const handleMouseLeave = async () => {
  if (videoRef.value) {
    isPlaying.value = false;

    // 如果有正在进行的 play() Promise，等待它完成或取消
    if (playPromise) {
      try {
        await playPromise;
      } catch (e) {
        // 忽略任何播放错误
      }
      playPromise = null;
    }

    videoRef.value.pause();
    // 需求：不要初始化到 0，在指定的开始时间和结束时间内循环
    // 离开时重置到开始时间，以便下次播放
    videoRef.value.currentTime = props.startTime;
  }
};

watch(() => props.startTime, (newVal) => {
  if (videoRef.value) {
    videoRef.value.currentTime = newVal;
  }
});
</script>

<style scoped>
.video-segment-player {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 80px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.segment-video {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 填充容器 */
}

.time-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 2px;
  pointer-events: none;
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(50, 50, 50, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff4d4f;
  font-size: 12px;
}
</style>