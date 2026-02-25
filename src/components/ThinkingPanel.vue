<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-vue-next'

const va = useVideoAnalysis()

// 面板展开状态
const isOpen = ref(true)

// 滚动容器引用
const scrollContainer = ref<HTMLElement | null>(null)

// 是否有思考内容
const hasThinkingContent = computed(() => va.thinkingContent.value.length > 0)

// 是否应该显示思考面板 - 只要有思考内容就显示（不依赖 enableThinking 状态）
const shouldShow = computed(() => va.isThinking.value || hasThinkingContent.value)

// 当思考内容更新时，自动滚动到底部
watch(() => va.thinkingContent.value, () => {
  nextTick(() => {
    if (scrollContainer.value && isOpen.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
})
</script>

<template>
  <Collapsible
    v-if="shouldShow"
    v-model:open="isOpen"
    class="rounded-lg border bg-muted/30"
  >
    <CollapsibleTrigger class="flex w-full items-center justify-between p-3 text-sm hover:bg-muted/50">
      <div class="flex items-center gap-2">
        <Brain class="h-4 w-4 text-purple-500" />
        <span class="font-medium">思考过程</span>
        <Loader2 v-if="va.isThinking.value" class="h-3 w-3 animate-spin text-purple-500" />
        <span v-if="va.isThinking.value" class="text-xs text-muted-foreground">思考中...</span>
      </div>
      <ChevronDown v-if="!isOpen" class="h-4 w-4" />
      <ChevronUp v-else class="h-4 w-4" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div class="border-t px-3 py-2">
        <div ref="scrollContainer" class="max-h-60 overflow-auto">
          <pre class="whitespace-pre-wrap text-xs text-muted-foreground font-mono">{{ va.thinkingContent.value }}</pre>
        </div>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
