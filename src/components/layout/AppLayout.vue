<script setup lang="ts">
import { ref } from 'vue'
import AppMenu from './AppMenu.vue'
import UserBar from './UserBar.vue'

const isMenuCollapsed = ref(false)
const isConfigCollapsed = ref(false)

function toggleMenu() {
  isMenuCollapsed.value = !isMenuCollapsed.value
}

function toggleConfig() {
  isConfigCollapsed.value = !isConfigCollapsed.value
}
</script>

<template>
  <div class="flex h-screen flex-col bg-background">
    <!-- 主内容区：三栏布局 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左一：菜单栏 -->
      <aside
        class="flex flex-col border-r bg-card transition-all duration-300"
        :class="isMenuCollapsed ? 'w-16' : 'w-48'"
      >
        <AppMenu :collapsed="isMenuCollapsed" @toggle="toggleMenu" />
      </aside>

      <!-- 左二：配置区 -->
      <aside
        class="flex flex-col border-r bg-muted/30 transition-all duration-300"
        :class="isConfigCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'"
      >
        <div class="flex h-full flex-col">
          <!-- 配置区头部 -->
          <div
            class="flex h-12 items-center justify-between border-b px-4"
          >
            <span class="text-sm font-medium">配置</span>
            <button
              class="rounded p-1 hover:bg-muted"
              @click="toggleConfig"
            >
              <span class="text-xs">收起</span>
            </button>
          </div>
          <!-- 配置区内容 -->
          <div class="flex-1 overflow-y-auto">
            <slot name="config">
              <div class="p-4 text-center text-sm text-muted-foreground">
                请选择功能
              </div>
            </slot>
          </div>
        </div>
      </aside>

      <!-- 右侧：内容区 -->
      <main class="flex flex-1 flex-col overflow-hidden">
        <!-- 内容区头部 -->
        <header class="flex h-12 items-center justify-end border-b px-4">
          <button
            v-if="isConfigCollapsed"
            class="rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80"
            @click="toggleConfig"
          >
            显示配置 →
          </button>
        </header>
        <!-- 内容区主体 -->
        <div class="flex-1 overflow-y-auto p-6">
          <slot name="content">
            <div class="flex h-full items-center justify-center text-muted-foreground">
              选择左侧菜单开始
            </div>
          </slot>
        </div>
      </main>
    </div>

    <!-- 底部：用户状态栏 -->
    <UserBar />
  </div>
</template>
