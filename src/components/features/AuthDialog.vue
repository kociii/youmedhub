<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="close">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <!-- 登录表单 -->
      <div v-if="mode === 'login'">
        <h2 class="text-2xl font-bold mb-6 text-center">登录</h2>
        <form @submit.prevent="handleLogin">
          <div class="mb-4">
            <label class="block mb-2 text-sm font-medium">用户名</label>
            <input
              v-model="loginForm.username"
              type="text"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div class="mb-6">
            <label class="block mb-2 text-sm font-medium">密码</label>
            <input
              v-model="loginForm.password"
              type="password"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          >
            登录
          </button>
        </form>
        <p class="mt-4 text-center text-sm">
          还没有账号？
          <button @click="mode = 'register'" class="text-blue-500 hover:underline">注册</button>
        </p>
      </div>

      <!-- 注册表单 -->
      <div v-else>
        <h2 class="text-2xl font-bold mb-6 text-center">注册</h2>
        <form @submit.prevent="handleRegister">
          <div class="mb-4">
            <label class="block mb-2 text-sm font-medium">用户名</label>
            <input
              v-model="registerForm.username"
              type="text"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div class="mb-4">
            <label class="block mb-2 text-sm font-medium">邮箱</label>
            <input
              v-model="registerForm.email"
              type="email"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div class="mb-6">
            <label class="block mb-2 text-sm font-medium">密码</label>
            <input
              v-model="registerForm.password"
              type="password"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          >
            注册
          </button>
        </form>
        <p class="mt-4 text-center text-sm">
          已有账号？
          <button @click="mode = 'login'" class="text-blue-500 hover:underline">登录</button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { messageManager } from '@/utils/message'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const userStore = useUserStore()
const mode = ref<'login' | 'register'>('login')

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  email: '',
  password: ''
})

const handleLogin = async () => {
  try {
    await userStore.login(loginForm.username, loginForm.password)
    messageManager.success('登录成功')
    close()
  } catch (error) {
    messageManager.error('登录失败', '请检查用户名和密码')
  }
}

const handleRegister = async () => {
  try {
    await userStore.register(registerForm.username, registerForm.email, registerForm.password)
    messageManager.success('注册成功', '请登录使用')
    mode.value = 'login'
  } catch (error) {
    messageManager.error('注册失败', '请检查输入信息')
  }
}

const close = () => {
  emit('close')
}
</script>
