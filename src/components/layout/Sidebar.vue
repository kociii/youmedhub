<script setup lang="ts">
import { Scissors, Settings } from 'lucide-vue-next'

const emit = defineEmits<{
  navigate: [page: string]
}>()
</script>

<template>
  <aside class="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-4">
    <button
      @click="emit('navigate', 'analysis')"
      class="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
    >
      <Scissors class="w-6 h-6" />
    </button>
    <span class="text-xs text-gray-600 -mt-2">拆解脚本</span>

    <button
      @click="emit('navigate', 'admin')"
      class="w-12 h-12 rounded-lg text-gray-600 flex items-center justify-center hover:bg-gray-100 transition-colors"
    >
      <Settings class="w-6 h-6" />
    </button>
    <span class="text-xs text-gray-600 -mt-2">管理后台</span>
  </aside>
</template>
