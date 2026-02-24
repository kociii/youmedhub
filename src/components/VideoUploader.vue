<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { validateVideoFile } from '@/api/temporaryFile'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, Link } from 'lucide-vue-next'

const {
  videoFile, videoUrl, uploadStatus, resetAnalysis, clearVideoFile,
} = useVideoAnalysis()

const dragOver = ref(false)
const errorMsg = ref('')
const urlInput = ref('')
const showUrlInput = ref(false)

function checkDuration(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      if (video.duration > 600) {
        errorMsg.value = '视频时长不能超过 10 分钟'
        resolve(false)
      } else {
        resolve(true)
      }
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      errorMsg.value = '无法读取视频信息'
      resolve(false)
    }
    video.src = URL.createObjectURL(file)
  })
}

async function handleFile(file: File) {
  errorMsg.value = ''

  const validation = validateVideoFile(file)
  if (!validation.isValid) {
    errorMsg.value = validation.error || '文件校验失败'
    return
  }

  const durationOk = await checkDuration(file)
  if (!durationOk) return

  // 只保存文件，不立即上传
  videoFile.value = file
  uploadStatus.value = 'idle'
  resetAnalysis()
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function handleUrlInput() {
  if (!urlInput.value.trim()) {
    errorMsg.value = '请输入视频 URL'
    return
  }
  if (!urlInput.value.startsWith('http')) {
    errorMsg.value = '请输入有效的 HTTP URL'
    return
  }
  errorMsg.value = ''
  videoUrl.value = urlInput.value.trim()
  uploadStatus.value = 'success'
  videoFile.value = null // URL 方式不需要上传
  resetAnalysis()
}

// 清除视频文件
function handleClearVideo() {
  clearVideoFile()
  errorMsg.value = ''
}
</script>

<template>
  <Card
    class="flex flex-col items-center justify-center border-2 border-dashed p-6 transition-colors"
    :class="dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <!-- 已选择文件提示 -->
    <div v-if="videoFile" class="text-center">
      <p class="text-sm font-medium text-foreground">{{ videoFile.name }}</p>
      <p class="mt-1 text-xs text-muted-foreground">
        已选择，点击「开始分析」上传
      </p>
      <Button
        variant="ghost"
        size="sm"
        class="mt-2 text-xs"
        @click="handleClearVideo"
      >
        重新选择
      </Button>
    </div>

    <!-- 上传/输入区域 -->
    <template v-else>
      <label class="flex cursor-pointer flex-col items-center gap-2">
        <Upload class="h-10 w-10 text-muted-foreground" />
        <span class="text-sm font-medium">拖拽视频到此处或点击上传</span>
        <span class="text-xs text-muted-foreground">mp4, mov · ≤100MB · ≤10 分钟</span>
        <input
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          class="hidden"
          @change="onFileInput"
        />
      </label>

      <!-- URL 输入区域 -->
      <div class="mt-4 w-full">
        <Button
          variant="ghost"
          size="sm"
          class="mb-2 text-xs"
          @click="showUrlInput = !showUrlInput"
        >
          <Link class="mr-1 h-3 w-3" />
          {{ showUrlInput ? '隐藏 URL 输入' : '或输入视频 URL' }}
        </Button>
        <div v-if="showUrlInput" class="flex gap-2">
          <Input
            v-model="urlInput"
            placeholder="输入视频 URL"
            class="text-xs"
            @keyup.enter="handleUrlInput"
          />
          <Button size="sm" @click="handleUrlInput">确定</Button>
        </div>
      </div>
    </template>

    <p v-if="errorMsg" class="mt-2 text-xs text-destructive">{{ errorMsg }}</p>
  </Card>
</template>
