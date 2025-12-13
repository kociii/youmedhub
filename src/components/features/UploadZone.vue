<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import { useAnalysisStore } from '@/stores/analysis'

const store = useAnalysisStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (files?.[0]) {
    handleFile(files[0])
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleFile(file)
  }
}

const ALLOWED_TYPES = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const handleFile = (file: File) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert('仅支持 mp4、avi、mov 格式的视频')
    return
  }

  if (file.size > MAX_SIZE) {
    alert('文件大小不能超过 50MB')
    return
  }

  // 保存文件对象和创建预览 URL
  const previewUrl = URL.createObjectURL(file)
  store.setVideoUrl(previewUrl)
  store.setVideoFile(file)
}

const triggerUpload = () => {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer group"
    :class="[
      isDragging
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
    ]"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop="handleDrop"
    @click="triggerUpload"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".mp4,.avi,.mov"
      class="hidden"
      @change="handleFileSelect"
    />

    <div class="flex flex-col items-center gap-4">
      <div class="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
        <UploadCloud class="w-8 h-8" />
      </div>
      <div>
        <h3 class="text-base font-medium text-gray-700">点击或拖拽选择视频</h3>
        <p class="text-sm text-gray-500 mt-1">支持 MP4, MOV, AVI 格式 (最大 50MB)</p>
      </div>
    </div>
  </div>
</template>
