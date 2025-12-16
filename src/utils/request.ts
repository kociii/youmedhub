import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = 'http://localhost:8000'

// 创建管理后台请求实例
export const adminRequest: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000
})

// 创建前端用户请求实例
export const userRequest: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000
})

// 管理后台请求拦截器
adminRequest.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('admin_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 管理后台响应拦截器
adminRequest.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

// 前端用户请求拦截器
userRequest.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 排除认证接口
    const isAuthRoute = config.url?.includes('/api/auth/') &&
                     (config.method?.toLowerCase() === 'post')

    if (!isAuthRoute) {
      const token = localStorage.getItem('user_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 前端用户响应拦截器
userRequest.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user_token')
      // 不再自动跳转到登录页面，让组件自己处理
    }
    return Promise.reject(error)
  }
)

export default userRequest
