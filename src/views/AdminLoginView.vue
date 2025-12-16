<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminRequest } from '@/utils/request'
import { messageManager } from '@/utils/message'
import { User, Lock, Loader2, ShieldCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const router = useRouter()
const username = ref('kocijia')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    messageManager.error('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const response = await adminRequest.post('/api/admin/auth/login', {
      username: username.value,
      password: password.value
    })

    const { access_token } = response.data
    localStorage.setItem('admin_token', access_token)

    messageManager.success('登录成功')
    router.push('/admin')
  } catch (error: any) {
    console.error('登录失败:', error)
    messageManager.error(error.response?.data?.detail || '登录失败')
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
    <div class="w-full max-w-[380px]">
      <div class="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-8">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black text-white dark:bg-white dark:text-black mb-4">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
              管理后台
            </h2>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              请使用管理员账号登录
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleLogin">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">用户名</label>
                <input
                  id="username"
                  v-model="username"
                  name="username"
                  type="text"
                  required
                  class="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-all sm:text-sm"
                  placeholder="请输入用户名"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">密码</label>
                <input
                  id="password"
                  v-model="password"
                  name="password"
                  type="password"
                  required
                  class="block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white transition-all sm:text-sm"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            <Button
              type="submit"
              :disabled="loading"
              class="w-full py-2 bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 font-medium rounded-md transition-all duration-200"
            >
              <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
              {{ loading ? '登录中...' : '登录' }}
            </Button>
          </form>

          <div class="mt-6 text-center">
            <button
              @click="handleBack"
              class="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>