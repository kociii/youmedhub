import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { VideoScriptItem } from '@/types/video'

// 收藏项类型
export interface FavoriteItem {
  id: string
  user_id: string
  title: string
  description: string
  raw_markdown: string
  script_data: VideoScriptItem[]
  source_type: 'video' | 'create' | 'reference'
  source_url: string
  source_video_duration: number
  model_provider: string
  model_id: string
  input_tokens: number
  output_tokens: number
  shot_count: number
  created_at: string
  updated_at: string
}

// 保存收藏的参数
export interface SaveFavoriteParams {
  title: string
  description?: string
  rawMarkdown: string
  scriptData: VideoScriptItem[]
  sourceType: 'video' | 'create' | 'reference'
  sourceUrl?: string
  sourceVideoDuration?: number
  modelProvider?: string
  modelId?: string
  inputTokens?: number
  outputTokens?: number
}

// 模块级状态
const favorites = ref<FavoriteItem[]>([])
const loading = ref(false)

export function useFavorites() {
  const auth = useAuth()

  const hasFavorites = computed(() => favorites.value.length > 0)

  // 加载收藏列表
  async function loadFavorites() {
    if (!auth.isAuthenticated.value) {
      favorites.value = []
      return
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('script_favorites')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      favorites.value = (data as FavoriteItem[]) || []
    } catch (e) {
      console.error('加载收藏失败:', e)
      favorites.value = []
    } finally {
      loading.value = false
    }
  }

  // 保存收藏
  async function saveFavorite(params: SaveFavoriteParams): Promise<FavoriteItem> {
    if (!auth.user.value) {
      throw new Error('请先登录')
    }

    const { data, error } = await supabase
      .from('script_favorites')
      .insert({
        user_id: auth.user.value.id,
        title: params.title,
        description: params.description || '',
        raw_markdown: params.rawMarkdown,
        script_data: params.scriptData as unknown as Record<string, unknown>[],
        source_type: params.sourceType,
        source_url: params.sourceUrl || '',
        source_video_duration: params.sourceVideoDuration || 0,
        model_provider: params.modelProvider || '',
        model_id: params.modelId || '',
        input_tokens: params.inputTokens || 0,
        output_tokens: params.outputTokens || 0,
        shot_count: params.scriptData.length,
      })
      .select()
      .single()

    if (error) throw error

    // 更新本地列表
    favorites.value.unshift(data as FavoriteItem)
    return data as FavoriteItem
  }

  // 删除收藏
  async function deleteFavorite(id: string) {
    const { error } = await supabase
      .from('script_favorites')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 更新本地列表
    favorites.value = favorites.value.filter(f => f.id !== id)
  }

  // 更新收藏
  async function updateFavorite(id: string, updates: Partial<Pick<FavoriteItem, 'title' | 'description'>>) {
    const { data, error } = await supabase
      .from('script_favorites')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 更新本地列表
    const index = favorites.value.findIndex(f => f.id === id)
    if (index !== -1) {
      favorites.value[index] = data as FavoriteItem
    }
    return data as FavoriteItem
  }

  // 根据 ID 获取收藏
  function getFavoriteById(id: string): FavoriteItem | undefined {
    return favorites.value.find(f => f.id === id)
  }

  return {
    favorites,
    loading,
    hasFavorites,
    loadFavorites,
    saveFavorite,
    deleteFavorite,
    updateFavorite,
    getFavoriteById,
  }
}
