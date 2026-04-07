<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Toaster } from '@/components/ui/toast'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'

// 初始化全局状态
useVideoAnalysis()

const route = useRoute()
const isStandaloneRoute = computed(() => route.meta.standalone === true)
</script>

<template>
  <RouterView v-if="isStandaloneRoute" />
  <AppLayout v-else>
    <template #config>
      <RouterView name="config" />
    </template>
    <template #content>
      <RouterView />
    </template>
  </AppLayout>
  <Toaster />
  <Analytics />
</template>
