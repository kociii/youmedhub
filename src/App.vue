<script setup lang="ts">
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import ApiKeyDialog from '@/components/ApiKeyDialog.vue'
import LeftPanel from '@/components/LeftPanel.vue'
import RightPanel from '@/components/RightPanel.vue'

// 初始化全局状态
useVideoAnalysis()
</script>

<template>
  <div class="flex h-screen flex-col bg-background">
    <!-- 顶部栏 -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <div class="flex items-center gap-2">
        <img src="@/assets/logo.svg" alt="logo" class="h-7 w-7" />
        <span class="text-lg font-semibold">youmedhub</span>
      </div>
      <ApiKeyDialog />
    </header>

    <!-- 主内容区：左右分栏 -->
    <div class="flex flex-1 overflow-hidden">
      <LeftPanel class="w-80 shrink-0 border-r" />
      <RightPanel class="flex-1" />
    </div>
  </div>
</template>
