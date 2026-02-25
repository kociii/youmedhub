<script setup lang="ts">
import { ref } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { Button } from '@/components/ui/button'
import { ImagePlus, X } from 'lucide-vue-next'

const va = useVideoAnalysis()

const isDragging = ref(false)

// 支持的图片格式
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_COUNT = 6 // 最多 6 张

// 处理文件选择
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    for (let i = 0; i < input.files.length; i++) {
      if (va.imageFiles.value.length >= MAX_COUNT) break
      validateAndAddFile(input.files[i])
    }
  }
  // 重置 input 以便再次选择相同文件
  input.value = ''
}

// 处理拖放
function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files) {
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      if (va.imageFiles.value.length >= MAX_COUNT) break
      validateAndAddFile(event.dataTransfer.files[i])
    }
  }
}

// 验证并添加文件
function validateAndAddFile(file: File) {
  // 验证类型
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return
  }

  // 验证大小
  if (file.size > MAX_SIZE) {
    return
  }

  va.addImageFile(file)
}

// 移除图片
function removeImage(index: number) {
  va.removeImageFile(index)
}
</script>

<template>
  <div class="space-y-2">
    <!-- 图片网格：已上传图片 + 上传按钮 -->
    <div class="grid grid-cols-3 gap-2">
      <!-- 已上传的图片 -->
      <div
        v-for="(url, index) in va.localImageUrls.value"
        :key="index"
        class="relative group aspect-square"
      >
        <img
          :src="url"
          :alt="`图 ${index + 1}`"
          class="w-full h-full rounded-lg border object-cover"
        />
        <!-- 图片标签 -->
        <div class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white">
          图 {{ index + 1 }}
        </div>
        <!-- 删除按钮 -->
        <Button
          variant="destructive"
          size="icon"
          class="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          @click="removeImage(index)"
        >
          <X class="h-3 w-3" />
        </Button>
      </div>

      <!-- 上传按钮 - 始终显示，除非已达上限 -->
      <div
        v-if="va.imageFiles.value.length < MAX_COUNT"
        class="relative aspect-square"
        :class="{ 'ring-2 ring-primary ring-offset-1': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="($refs.fileInput as HTMLInputElement).click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          class="hidden"
          @change="handleFileSelect"
        />
        <div
          class="w-full h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
          :class="isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'"
        >
          <ImagePlus class="h-5 w-5 text-muted-foreground" />
          <span class="mt-1 text-[10px] text-muted-foreground">
            {{ va.imageFiles.value.length }}/{{ MAX_COUNT }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
