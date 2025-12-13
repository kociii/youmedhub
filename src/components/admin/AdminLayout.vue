<script setup lang="ts">
import { ref } from 'vue'
import { Settings, Users, CreditCard, BarChart3 } from 'lucide-vue-next'

const currentView = ref('ai-models')

const menuItems = [
  { id: 'ai-models', label: 'AI 模型', icon: Settings },
  { id: 'users', label: '用户管理', icon: Users, disabled: true },
  { id: 'credits', label: '权益管理', icon: CreditCard, disabled: true },
  { id: 'analytics', label: '数据统计', icon: BarChart3, disabled: true }
]

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <div class="flex h-full bg-gray-50">
    <!-- 左侧菜单 -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">管理后台</h2>
        <p class="text-sm text-gray-500 mt-1">系统配置与管理</p>
      </div>

      <nav class="flex-1 p-4 space-y-1">
        <button
          v-for="item in menuItems"
          :key="item.id"
          @click="!item.disabled && (currentView = item.id)"
          :disabled="item.disabled"
          :class="[
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
            currentView === item.id
              ? 'bg-blue-50 text-blue-600'
              : item.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-50'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          {{ item.label }}
          <span v-if="item.disabled" class="ml-auto text-xs text-gray-400">即将上线</span>
        </button>
      </nav>

      <div class="p-4 border-t border-gray-200">
        <button
          @click="emit('back')"
          class="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          ← 返回主页
        </button>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="flex-1 overflow-y-auto">
      <slot :current-view="currentView" />
    </main>
  </div>
</template>
