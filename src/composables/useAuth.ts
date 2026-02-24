import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// 模块级状态（单例）
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

// 初始化：获取当前会话
async function initialize() {
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null
  } catch (error) {
    console.error('获取会话失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听认证状态变化
supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession
  user.value = newSession?.user ?? null
})

// 初始化
initialize()

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const userName = computed(() => {
    const metadata = user.value?.user_metadata
    return metadata?.name || metadata?.full_name || metadata?.user_name || userEmail.value
  })
  const userAvatar = computed(() => {
    return user.value?.user_metadata?.avatar_url ?? ''
  })

  // 邮箱注册
  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // 邮箱登录
  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // GitHub OAuth 登录
  async function signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
    return data
  }

  // 退出登录
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
  }

  // 重置密码
  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    userEmail,
    userName,
    userAvatar,
    signUp,
    signIn,
    signInWithGitHub,
    signOut,
    resetPassword,
  }
}
