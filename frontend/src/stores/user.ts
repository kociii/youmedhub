import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
  created_at: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const clearToken = () => {
    token.value = null
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  const register = async (username: string, email: string, password: string) => {
    const response = await axios.post('/api/auth/register', {
      username,
      email,
      password
    })
    user.value = response.data
  }

  const login = async (username: string, password: string) => {
    const response = await axios.post('/api/auth/login', {
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
      const response = await axios.get('/api/auth/me')
      user.value = response.data
    } catch (error) {
      clearToken()
    }
  }

  // 初始化时设置 token
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
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
