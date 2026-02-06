<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import type { ParsedNode } from 'markstream-vue'
import MarkdownRender, { getMarkdown, parseMarkdownToStructure } from 'markstream-vue'
import 'markstream-vue/index.css'

const { markdownContent, analysisStatus } = useVideoAnalysis()

const md = getMarkdown()
const nodes = ref<ParsedNode[]>([])
const isFinal = computed(() => analysisStatus.value === 'success' || analysisStatus.value === 'error')

watch(markdownContent, (val) => {
  if (val) {
    nodes.value = parseMarkdownToStructure(val, md)
  }
})
</script>

<template>
  <MarkdownRender
    :nodes="nodes"
    :max-live-nodes="0"
    :batch-rendering="true"
    :final="isFinal"
  />
</template>
