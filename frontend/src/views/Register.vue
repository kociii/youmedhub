<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-6 text-center">注册</h2>
      <form @submit.prevent="handleRegister">
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium">用户名</label>
          <input
            v-model="username"
            type="text"
            class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium">邮箱</label>
          <input
            v-model="email"
            type="email"
            class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div class="mb-6">
          <label class="block mb-2 text-sm font-medium">密码</label>
          <input
            v-model="password"
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
        <router-link to="/login" class="text-blue-500 hover:underline">登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const email = ref('')
const password = ref('')

const handleRegister = async () => {
  try {
    await userStore.register(username.value, email.value, password.value)
    alert('注册成功，请登录')
    router.push('/login')
  } catch (error) {
    alert('注册失败')
  }
}
</script>
