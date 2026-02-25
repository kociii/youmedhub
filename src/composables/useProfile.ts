import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

// Profile 类型
export interface Profile {
  id: string
  nickname: string
  avatar_url: string
  created_at: string
  updated_at: string
}

// 模块级状态
const profile = ref<Profile | null>(null)
const loading = ref(false)

export function useProfile() {
  const auth = useAuth()

  const nickname = computed(() => {
    // 优先使用 profile 中的昵称，其次是 auth metadata
    return profile.value?.nickname || auth.userName.value
  })

  const avatarUrl = computed(() => {
    return profile.value?.avatar_url || auth.userAvatar.value
  })

  // 加载用户 profile
  async function loadProfile() {
    if (!auth.user.value) {
      profile.value = null
      return
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', auth.user.value.id)
        .single()

      if (error) {
        // 如果 profile 不存在，尝试创建
        if (error.code === 'PGRST116') {
          await createProfile()
          return
        }
        throw error
      }
      profile.value = data as Profile
    } catch (e) {
      console.error('加载 profile 失败:', e)
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  // 创建 profile（如果不存在）
  async function createProfile() {
    if (!auth.user.value) return

    const newProfile = {
      id: auth.user.value.id,
      nickname: auth.user.value.user_metadata?.name ||
                auth.user.value.user_metadata?.full_name ||
                auth.user.value.email?.split('@')[0] ||
                '用户',
      avatar_url: auth.user.value.user_metadata?.avatar_url || '',
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single()

    if (error) {
      console.error('创建 profile 失败:', error)
      return
    }
    profile.value = data as Profile
  }

  // 更新昵称
  async function updateNickname(newNickname: string) {
    if (!auth.user.value || !profile.value) {
      throw new Error('请先登录')
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ nickname: newNickname })
      .eq('id', auth.user.value.id)
      .select()
      .single()

    if (error) throw error
    profile.value = data as Profile
    return data as Profile
  }

  // 更新头像 URL
  async function updateAvatarUrl(newAvatarUrl: string) {
    if (!auth.user.value || !profile.value) {
      throw new Error('请先登录')
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', auth.user.value.id)
      .select()
      .single()

    if (error) throw error
    profile.value = data as Profile
    return data as Profile
  }

  return {
    profile,
    loading,
    nickname,
    avatarUrl,
    loadProfile,
    updateNickname,
    updateAvatarUrl,
  }
}
