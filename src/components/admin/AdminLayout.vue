<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Settings, Users, CreditCard, BarChart3, LogOut } from 'lucide-vue-next'
import { messageManager } from '@/utils/message'

const router = useRouter()
const currentView = ref('ai-models')

const menuItems = [
  { id: 'ai-models', label: 'AI 模型', icon: Settings },
  { id: 'users', label: '用户管理', icon: Users },
  { id: 'credits', label: '权益管理', icon: CreditCard, disabled: true },
  { id: 'analytics', label: '数据统计', icon: BarChart3, disabled: true }
]

const emit = defineEmits<{
  back: []
}>()

const handleLogout = () => {
  localStorage.removeItem('admin_token')
  messageManager.success('已退出登录')
  router.push('/admin/login')
}
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
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
            currentView === item.id
              ? 'bg-gray-900 text-white shadow-sm'
              : item.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          ]"
        >
          <component :is="item.icon" class="w-4 h-4" />
          {{ item.label }}
          <span v-if="item.disabled" class="ml-auto text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Soon</span>
        </button>
      </nav>

      <div class="p-4 border-t border-gray-200 space-y-2">
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut class="w-4 h-4" />
          退出登录
        </button>
        <button
          @click="emit('back')"
          class="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
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
