<script setup lang="ts">
import { computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import MarkdownRender from 'markstream-vue'
import 'markstream-vue/index.css'

const { markdownContent, analysisStatus } = useVideoAnalysis()

const isFinal = computed(() => analysisStatus.value === 'success' || analysisStatus.value === 'error')
</script>

<template>
  <MarkdownRender
    :content="markdownContent"
    :final="isFinal"
    :max-live-nodes="0"
    :render-batch-size="16"
    :render-batch-delay="8"
  />
</template>
