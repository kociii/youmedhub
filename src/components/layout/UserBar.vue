<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { LogIn, LogOut, User } from 'lucide-vue-next'

const router = useRouter()

// TODO: 集成 useAuth
const isAuthenticated = ref(false)
const user = ref<{ email: string; nickname: string } | null>(null)

const displayName = computed(() => {
  return user.value?.nickname || user.value?.email?.split('@')[0] || '用户'
})

function handleLogin() {
  router.push('/login')
}

function handleLogout() {
  // TODO: 实现登出
  user.value = null
  isAuthenticated.value = false
  router.push('/')
}

function handleProfile() {
  router.push('/profile')
}
</script>

<template>
  <div class="flex h-12 items-center justify-between border-t bg-card px-4">
    <!-- 用户信息 -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
      >
        <User class="h-4 w-4 text-muted-foreground" />
      </div>
      <div v-if="isAuthenticated" class="text-sm">
        <span class="font-medium">{{ displayName }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-2">
      <template v-if="isAuthenticated">
        <button
          class="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          @click="handleProfile"
        >
          <User class="h-4 w-4" />
          <span>个人中心</span>
        </button>
        <button
          class="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          @click="handleLogout"
        >
          <LogOut class="h-4 w-4" />
          <span>退出</span>
        </button>
      </template>
      <template v-else>
        <button
          class="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
          @click="handleLogin"
        >
          <LogIn class="h-4 w-4" />
          <span>登录</span>
        </button>
      </template>
    </div>
  </div>
</template>
