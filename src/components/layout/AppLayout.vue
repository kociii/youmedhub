<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppMenu from './AppMenu.vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'

const route = useRoute()
const va = useVideoAnalysis()
const isMenuCollapsed = ref(false)

// 只有拆解脚本和脚本生成页需要左二栏
const showConfigPanel = computed(() => {
  return route.meta.hasConfig === true
})

// 根据路由显示对应的功能名称
const panelTitle = computed(() => {
  const titles: Record<string, string> = {
    analyze: '拆解脚本',
    create: '脚本生成',
  }
  return titles[route.name as string] || '配置'
})

// 配置栏宽度：创建页面在生成前展开，生成后收起
const configPanelWidth = computed(() => {
  if (route.name === 'create') {
    return va.isConfigPanelExpanded.value ? 'w-[480px]' : 'w-80'
  }
  return 'w-80'
})
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- 左一：菜单栏 -->
    <aside
      class="flex flex-col border-r bg-card transition-all duration-300"
      :class="isMenuCollapsed ? 'w-16' : 'w-48'"
    >
      <AppMenu :collapsed="isMenuCollapsed" />
    </aside>

    <!-- 左二：配置区（仅解析和生成页显示） -->
    <aside
      v-if="showConfigPanel"
      class="flex flex-col border-r bg-muted/30 transition-all duration-300"
      :class="configPanelWidth"
    >
      <div class="flex h-full flex-col">
        <!-- 配置区头部 -->
        <div class="flex h-12 items-center border-b px-4">
          <span class="text-sm font-medium">{{ panelTitle }}</span>
        </div>
        <!-- 配置区内容 -->
        <div class="flex-1 overflow-y-auto">
          <slot name="config">
            <div class="p-4 text-center text-sm text-muted-foreground">请选择功能</div>
          </slot>
        </div>
      </div>
    </aside>

    <!-- 右侧：内容区 -->
    <main class="flex flex-1 flex-col overflow-hidden">
      <!-- 内容区主体 -->
      <div class="flex-1 overflow-y-auto">
        <slot name="content">
          <div class="flex h-full items-center justify-center text-muted-foreground">
            选择左侧菜单开始
          </div>
        </slot>
      </div>
    </main>
  </div>
</template>
