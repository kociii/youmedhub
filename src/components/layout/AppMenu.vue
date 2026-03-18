<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Sparkles, FileText, History, Heart, Settings, LogIn, LogOut, User } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/components/ui/toast'
import AuthDialog from '@/components/AuthDialog.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import logoUrl from '@/assets/logo.svg'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { toast } = useToast()

const showAuthDialog = ref(false)

// 主菜单
const mainMenuItems = [
  { name: 'home', label: '首页', icon: Home, path: '/' },
  { name: 'analyze', label: '拆解脚本', icon: Sparkles, path: '/analyze' },
  { name: 'create', label: '脚本生成', icon: FileText, path: '/create' },
]

// 底部菜单
const bottomMenuItems = [
  { name: 'history', label: '历史记录', icon: History, path: '/history' },
  { name: 'favorites', label: '我的收藏', icon: Heart, path: '/favorites' },
  { name: 'settings', label: '设置', icon: Settings, path: '/settings' },
]

const activeMenu = computed(() => route.name as string)

function navigate(path: string) {
  router.push(path)
}

function handleLoginClick() {
  if (auth.isAuthenticated.value) {
    router.push('/profile')
  } else {
    showAuthDialog.value = true
  }
}

async function handleLogout() {
  try {
    await auth.signOut()
    toast({
      title: '已退出登录',
    })
    router.push('/')
  } catch (e) {
    toast({
      title: '退出失败',
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  }
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
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

      <!-- 登录/用户菜单 -->
      <div class="mt-1">
        <!-- 未登录：显示登录按钮 -->
        <button
          v-if="!auth.isAuthenticated.value"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          :class="
            activeMenu === 'login'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
          @click="handleLoginClick"
        >
          <LogIn class="h-5 w-5 shrink-0" />
          <span v-if="!collapsed" class="truncate">登录</span>
        </button>

        <!-- 已登录：显示用户下拉菜单 -->
        <DropdownMenu v-else>
          <DropdownMenuTrigger as-child>
            <button
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <Avatar class="h-5 w-5">
                <AvatarImage :src="auth.userAvatar.value" />
                <AvatarFallback class="text-xs">
                  {{ getInitials(auth.userName.value) }}
                </AvatarFallback>
              </Avatar>
              <span v-if="!collapsed" class="truncate">{{ auth.userName.value }}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" :side-offset="4">
            <DropdownMenuLabel>
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium">{{ auth.userName.value }}</p>
                <p class="text-xs text-muted-foreground">{{ auth.userEmail.value }}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="navigate('/profile')">
              <User class="mr-2 h-4 w-4" />
              个人中心
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout" class="text-destructive">
              <LogOut class="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="showAuthDialog" />
  </div>
</template>
