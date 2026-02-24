<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Sparkles, FileText, Heart, Settings, LogIn, User } from 'lucide-vue-next'
import logoUrl from '@/assets/logo.svg'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()

// 主菜单
const mainMenuItems = [
  { name: 'home', label: '首页', icon: Home, path: '/' },
  { name: 'analyze', label: '视频脚本解析', icon: Sparkles, path: '/analyze' },
  { name: 'create', label: '脚本生成', icon: FileText, path: '/create' },
]

// 底部菜单
const bottomMenuItems = [
  { name: 'favorites', label: '我的收藏', icon: Heart, path: '/favorites' },
  { name: 'settings', label: '设置', icon: Settings, path: '/settings' },
]

// 登录/个人中心
const authMenuItem = computed(() => {
  // TODO: 从 useAuth 获取登录状态
  const isAuthenticated = false
  return isAuthenticated
    ? { name: 'profile', label: '个人中心', icon: User, path: '/profile' }
    : { name: 'login', label: '登录', icon: LogIn, path: '/login' }
})

const activeMenu = computed(() => route.name as string)

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Logo 区域 -->
    <div class="flex h-12 items-center justify-center px-4">
      <img v-if="!collapsed" :src="logoUrl" alt="YouMedHub" class="h-6" />
      <img v-else :src="logoUrl" alt="Y" class="h-6" />
    </div>

    <!-- 主菜单 -->
    <nav class="flex-1 space-y-1 p-2">
      <button
        v-for="item in mainMenuItems"
        :key="item.name"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
        :class="
          activeMenu === item.name
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        "
        @click="navigate(item.path)"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
      </button>
    </nav>

    <!-- 底部菜单 -->
    <div class="border-t p-2">
      <button
        v-for="item in bottomMenuItems"
        :key="item.name"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
        :class="
          activeMenu === item.name
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        "
        @click="navigate(item.path)"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
      </button>

      <!-- 登录/个人中心 -->
      <button
        class="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
        :class="
          activeMenu === authMenuItem.name
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        "
        @click="navigate(authMenuItem.path)"
      >
        <component :is="authMenuItem.icon" class="h-5 w-5 shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ authMenuItem.label }}</span>
      </button>
    </div>
  </div>
</template>
