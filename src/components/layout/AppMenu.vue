<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Sparkles, Heart, Settings } from 'lucide-vue-next'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: 'home', label: '首页', icon: Home, path: '/' },
  { name: 'script', label: '脚本创作', icon: Sparkles, path: '/script' },
  { name: 'favorites', label: '我的收藏', icon: Heart, path: '/favorites' },
  { name: 'settings', label: '设置', icon: Settings, path: '/settings' },
]

const activeMenu = computed(() => {
  return route.name as string
})

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Logo 区域 -->
    <div class="flex h-14 items-center justify-center border-b px-4">
      <span v-if="!collapsed" class="text-lg font-semibold">YouMedHub</span>
      <span v-else class="text-lg font-semibold">Y</span>
    </div>

    <!-- 菜单列表 -->
    <nav class="flex-1 space-y-1 p-2">
      <button
        v-for="item in menuItems"
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
  </div>
</template>
