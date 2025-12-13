<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud, FileVideo } from 'lucide-vue-next'
import { useAnalysisStore } from '@/stores/analysis'

const store = useAnalysisStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0])
  }
}

const handleFile = (file: File) => {
  if (!file.type.startsWith('video/')) {
    alert('请上传视频文件')
    return
  }
  
  // Create local object URL for preview
  const url = URL.createObjectURL(file)
  store.setVideoUrl(url)
}

const triggerUpload = () => {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group"
    :class="[
      isDragging 
        ? 'border-blue-500 bg-blue-50/50' 
        : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
    ]"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop="handleDrop"
    @click="triggerUpload"
  >
    <input
      ref="fileInput"
      type="file"
      accept="video/*"
      class="hidden"
      @change="handleFileSelect"
    />
    
    <div class="flex flex-col items-center gap-4">
      <div class="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
        <UploadCloud class="w-8 h-8" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-slate-700">点击或拖拽上传视频</h3>
        <p class="text-sm text-slate-500 mt-1">支持 MP4, MOV, AVI 等格式 (最大 100MB)</p>
      </div>
    </div>
  </div>
</template>
