<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { uploadToTemporaryFile, validateVideoFile } from '@/api/temporaryFile'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload } from 'lucide-vue-next'

const {
  videoFile, videoUrl, uploadProgress, uploadStatus, resetAnalysis,
} = useVideoAnalysis()

const dragOver = ref(false)
const errorMsg = ref('')

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

  videoFile.value = file
  uploadStatus.value = 'uploading'
  uploadProgress.value = 0
  resetAnalysis()

  try {
    const result = await uploadToTemporaryFile(file, (loaded, total) => {
      uploadProgress.value = total > 0 ? Math.round((loaded / total) * 100) : 0
    })
    videoUrl.value = result.downloadLink
    uploadStatus.value = 'success'
  } catch (e: any) {
    errorMsg.value = e.message || '上传失败'
    uploadStatus.value = 'error'
  }
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
</script>

<template>
  <Card
    class="flex flex-col items-center justify-center border-2 border-dashed p-6 transition-colors"
    :class="dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <template v-if="uploadStatus === 'uploading'">
      <p class="mb-2 text-sm text-muted-foreground">
        正在上传 {{ videoFile?.name }}
      </p>
      <Progress :model-value="uploadProgress" class="w-full" />
      <p class="mt-1 text-xs text-muted-foreground">{{ uploadProgress }}%</p>
    </template>
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
      <p v-if="errorMsg" class="mt-2 text-xs text-destructive">{{ errorMsg }}</p>
    </template>
  </Card>
</template>
