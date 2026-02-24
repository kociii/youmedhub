<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFavorites, type FavoriteItem } from '@/composables/useFavorites'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, Trash2, FileText, Calendar, Layers, Clock } from 'lucide-vue-next'

const router = useRouter()
const favorites = useFavorites()
const videoAnalysis = useVideoAnalysis()
const { toast } = useToast()

const searchQuery = ref('')
const deleteTarget = ref<FavoriteItem | null>(null)
const loading = ref(true)

// 加载收藏列表
onMounted(async () => {
  try {
    await favorites.loadFavorites()
  } catch (e) {
    toast({
      title: '加载失败',
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
})

// 过滤后的列表
const filteredFavorites = computed(() => {
  if (!searchQuery.value) return favorites.favorites.value
  const query = searchQuery.value.toLowerCase()
  return favorites.favorites.value.filter(
    (f) =>
      f.title.toLowerCase().includes(query) ||
      f.description?.toLowerCase().includes(query)
  )
})

// 按日期分组
const groupedFavorites = computed(() => {
  const groups: Record<string, FavoriteItem[]> = {}
  for (const item of filteredFavorites.value) {
    const date = new Date(item.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return groups
})

// 加载到编辑器
function handleLoad(item: FavoriteItem) {
  videoAnalysis.markdownContent.value = item.raw_markdown
  videoAnalysis.scriptItems.value = item.script_data
  videoAnalysis.viewMode.value = 'table'
  router.push('/analyze')
}

// 确认删除
async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await favorites.deleteFavorite(deleteTarget.value.id)
    toast({
      title: '删除成功',
    })
  } catch (e) {
    toast({
      title: '删除失败',
      description: e instanceof Error ? e.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    deleteTarget.value = null
  }
}

// 格式化时长
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 格式化时间
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 头部 -->
    <div class="shrink-0 border-b p-4">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-semibold">我的收藏</h1>
        <Badge variant="secondary">
          {{ favorites.favorites.value.length }} 条
        </Badge>
      </div>

      <!-- 搜索 -->
      <div class="mt-4 relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="搜索收藏..."
          class="pl-9"
        />
      </div>
    </div>

    <!-- 列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- 加载中 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-muted-foreground">加载中...</div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="favorites.favorites.value.length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <FileText class="h-12 w-12 mb-4 opacity-50" />
        <p>暂无收藏</p>
        <p class="text-sm mt-1">分析视频后点击收藏按钮保存脚本</p>
      </div>

      <!-- 无搜索结果 -->
      <div
        v-else-if="filteredFavorites.length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <Search class="h-12 w-12 mb-4 opacity-50" />
        <p>未找到匹配的收藏</p>
      </div>

      <!-- 分组列表 -->
      <div v-else class="space-y-6">
        <div v-for="(items, date) in groupedFavorites" :key="date">
          <h3 class="mb-3 text-sm font-medium text-muted-foreground">{{ date }}</h3>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              v-for="item in items"
              :key="item.id"
              class="cursor-pointer transition-colors hover:bg-accent"
              @click="handleLoad(item)"
            >
              <CardHeader class="pb-2">
                <div class="flex items-start justify-between gap-2">
                  <CardTitle class="text-base line-clamp-1">{{ item.title }}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 shrink-0"
                    @click.stop="deleteTarget = item"
                  >
                    <Trash2 class="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <CardDescription v-if="item.description" class="line-clamp-2">
                  {{ item.description }}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div class="flex items-center gap-1">
                    <Layers class="h-3.5 w-3.5" />
                    {{ item.shot_count }} 个分镜
                  </div>
                  <div v-if="item.source_video_duration" class="flex items-center gap-1">
                    <Clock class="h-3.5 w-3.5" />
                    {{ formatDuration(item.source_video_duration) }}
                  </div>
                  <div class="flex items-center gap-1">
                    <Calendar class="h-3.5 w-3.5" />
                    {{ formatTime(item.created_at) }}
                  </div>
                </div>
                <div v-if="item.model_provider" class="mt-2">
                  <Badge variant="outline" class="text-xs">
                    {{ item.model_provider }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <AlertDialog :open="!!deleteTarget" @update:open="deleteTarget = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除「{{ deleteTarget?.title }}」吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="handleDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
