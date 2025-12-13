<script setup lang="ts">
import { Play } from 'lucide-vue-next'

defineProps<{
  startTime: string
  duration: string
}>()

defineEmits<{
  (e: 'play'): void
}>()
</script>

<template>
  <div 
    class="relative group cursor-pointer rounded-md overflow-hidden bg-slate-100 hover:bg-slate-200 transition-colors"
    @click="$emit('play')"
  >
    <div class="aspect-video flex items-center justify-center">
      <Play class="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
    </div>
    <div class="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
      {{ duration }}
    </div>
  </div>
</template>
