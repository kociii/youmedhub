<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { useAuth } from '@/composables/useAuth'
import { useProjects } from '@/composables/useProjects'
import { exportToExcel } from '@/utils/exportExcel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { FileSpreadsheet, FileText, Table2, Heart, FolderPlus } from 'lucide-vue-next'
import AuthDialog from '@/components/AuthDialog.vue'
import FavoriteDialog from '@/components/FavoriteDialog.vue'

const va = useVideoAnalysis()
const auth = useAuth()
const projectStore = useProjects()
const { toast } = useToast()

const showAuthDialog = ref(false)
const showFavoriteDialog = ref(false)
const creatingProject = ref(false)

// 收藏数据
const favoriteData = computed(() => {
  if (!va.hasResult.value || !va.scriptItems.value.length) return null
  return {
    rawMarkdown: va.markdownContent.value,
    scriptData: va.scriptItems.value,
    sourceType: 'video' as const,
    sourceUrl: va.videoUrl.value,
    shotCount: va.scriptItems.value.length,
    modelProvider: va.selectedModel.value?.providerName || '',
    modelId: va.selectedModel.value?.id || '',
    inputTokens: va.tokenUsage.value?.prompt_tokens || 0,
    outputTokens: va.tokenUsage.value?.completion_tokens || 0,
  }
})

// 点击收藏
function handleFavoriteClick() {
  if (!auth.isAuthenticated.value) {
    showAuthDialog.value = true
    return
  }
  showFavoriteDialog.value = true
}

// 收藏成功
function handleFavoriteSaved() {
  toast({
    title: '保存成功',
    description: '脚本已添加到收藏',
  })
}

function resolveProjectSourceType(): 'analyze' | 'create' | 'reference' {
  if (va.analysisMode.value === 'analyze') return 'analyze'
  if (va.analysisMode.value === 'reference') return 'reference'
  return 'create'
}

function buildProjectTitle(): string {
  const dateLabel = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (va.analysisMode.value === 'analyze') {
    return `拆解项目 ${dateLabel}`
  }
  if (va.analysisMode.value === 'reference') {
    return `参考项目 ${dateLabel}`
  }
  return `创作项目 ${dateLabel}`
}

async function handleCreateProject() {
  if (!auth.isAuthenticated.value) {
    showAuthDialog.value = true
    return
  }
  if (!va.hasResult.value || !va.scriptItems.value.length) {
    toast({
      title: '当前没有可导入脚本',
      description: '请先完成拆解或创作后再新建项目',
      variant: 'destructive',
    })
    return
  }

  creatingProject.value = true
  try {
    const { projectId } = await projectStore.createProjectFromScript({
      title: buildProjectTitle(),
      sourceType: resolveProjectSourceType(),
      scriptItems: va.scriptItems.value,
    })

    window.open(`/projects/${projectId}`, '_blank', 'noopener')
    toast({
      title: '项目创建成功',
      description: '已在新标签页打开项目画布',
    })
  } catch (error) {
    toast({
      title: '项目创建失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    creatingProject.value = false
  }
}
</script>

<template>
  <div class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
    <span class="text-sm font-medium text-muted-foreground">分析结果</span>

    <Separator orientation="vertical" class="mx-1 h-5" />

    <div v-if="va.hasResult.value" class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        :class="va.viewMode.value === 'markdown' ? 'bg-accent' : ''"
        @click="va.viewMode.value = 'markdown'"
      >
        <FileText class="mr-1.5 h-4 w-4" />
        原始内容
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :class="va.viewMode.value === 'table' ? 'bg-accent' : ''"
        @click="va.viewMode.value = 'table'"
      >
        <Table2 class="mr-1.5 h-4 w-4" />
        分镜表格
      </Button>
    </div>

    <div class="flex-1" />

    <div v-if="va.tokenUsage.value" class="flex items-center gap-2">
      <Badge variant="secondary" class="text-xs">
        输入 {{ va.tokenUsage.value.prompt_tokens.toLocaleString() }}
      </Badge>
      <Badge variant="secondary" class="text-xs">
        输出 {{ va.tokenUsage.value.completion_tokens.toLocaleString() }}
      </Badge>
    </div>

    <!-- 收藏按钮 -->
    <Button
      v-if="va.hasResult.value && va.scriptItems.value.length"
      variant="outline"
      size="sm"
      @click="handleFavoriteClick"
    >
      <Heart class="mr-1.5 h-4 w-4" />
      收藏
    </Button>

    <Button
      v-if="va.hasResult.value && va.scriptItems.value.length"
      variant="outline"
      size="sm"
      :disabled="creatingProject"
      @click="handleCreateProject"
    >
      <FolderPlus class="mr-1.5 h-4 w-4" />
      {{ creatingProject ? '创建中...' : '新建项目' }}
    </Button>

    <Button
      v-if="va.hasResult.value && va.scriptItems.value.length"
      variant="outline"
      size="sm"
      @click="exportToExcel(va.scriptItems.value)"
    >
      <FileSpreadsheet class="mr-1.5 h-4 w-4" />
      导出 Excel
    </Button>

    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="showAuthDialog" />

    <!-- 收藏弹窗 -->
    <FavoriteDialog
      v-model:open="showFavoriteDialog"
      :data="favoriteData"
      @saved="handleFavoriteSaved"
    />
  </div>
</template>
