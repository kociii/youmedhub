<script setup lang="ts">
import { User, ChevronDown } from 'lucide-vue-next'
</script>

<template>
  <header class="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6">
    <div class="flex items-center gap-2 md:gap-3">
      <img src="@/assets/logo.svg" alt="YouMedHub" class="h-6 w-6 md:h-8 md:w-8" />
      <span class="text-lg md:text-xl font-semibold text-gray-900">析见</span>
    </div>

    <div class="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-gray-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-colors">
      <div class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center">
        <User class="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
      </div>
      <div class="text-sm hidden sm:block">
        <div class="font-medium text-gray-900">用户名</div>
        <div class="text-gray-500 text-xs">85 点</div>
      </div>
      <ChevronDown class="w-4 h-4 text-gray-400 hidden sm:block" />
    </div>
  </header>
</template>
