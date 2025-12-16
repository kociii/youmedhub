import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userRequest } from '@/utils/request'

interface User {
  id: number
  username: string
  email: string
  credits: number
  created_at: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('user_token'))

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('user_token', newToken)
  }

  const clearToken = () => {
    token.value = null
    localStorage.removeItem('user_token')
  }

  const register = async (username: string, email: string, password: string) => {
    const response = await userRequest.post('/api/auth/register', {
      username,
      email,
      password
    })
    user.value = response.data
  }

  const login = async (username: string, password: string) => {
    const response = await userRequest.post('/api/auth/login', {
      username,
      password
    })
    setToken(response.data.access_token)
    user.value = response.data.user
  }

  const logout = () => {
    clearToken()
    user.value = null
  }

  const fetchMe = async () => {
    if (!token.value) return
    try {
      const response = await userRequest.get('/api/auth/me')
      user.value = response.data
    } catch (error) {
      clearToken()
    }
  }

  // 初始化时获取用户信息
  if (token.value) {
    fetchMe()
  }

  return {
    user,
    token,
    register,
    login,
    logout,
    fetchMe
  }
})