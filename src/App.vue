<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'

// 初始化全局状态
useVideoAnalysis()
</script>

<template>
  <AppLayout>
    <template #config>
      <RouterView name="config" />
    </template>
    <template #content>
      <RouterView />
    </template>
  </AppLayout>
</template>
