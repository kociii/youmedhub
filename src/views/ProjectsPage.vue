<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProjects } from '@/composables/useProjects'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Plus, Search } from 'lucide-vue-next'

const projectStore = useProjects()
const { toast } = useToast()
const searchText = ref('')
const creating = ref(false)

async function loadProjects() {
  try {
    await projectStore.loadProjects(searchText.value)
  } catch (error) {
    toast({
      title: '加载项目失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  }
}

async function handleCreateProject() {
  creating.value = true
  try {
    const { projectId } = await projectStore.createEmptyProject()
    window.open(`/projects/${projectId}`, '_blank', 'noopener')
    toast({
      title: '项目已创建',
      description: '已在新标签页打开项目画布',
    })
    await loadProjects()
  } catch (error) {
    toast({
      title: '创建项目失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    creating.value = false
  }
}

function openProject(projectId: string) {
  window.open(`/projects/${projectId}`, '_blank', 'noopener')
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(loadProjects)
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold">项目</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            项目是独立工作板块，可从脚本拆解或脚本创作一键新建并进入全屏画布。
          </p>
        </div>
        <Button :disabled="creating" @click="handleCreateProject">
          <Plus class="mr-2 h-4 w-4" />
          {{ creating ? '创建中...' : '新建项目' }}
        </Button>
      </div>

      <div class="flex gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchText"
            class="pl-9"
            placeholder="搜索项目标题或描述"
            @keyup.enter="loadProjects"
          />
        </div>
        <Button variant="outline" @click="loadProjects">搜索</Button>
      </div>

      <div v-if="projectStore.loading.value" class="py-12 text-center text-muted-foreground">
        正在加载项目...
      </div>

      <div v-else-if="!projectStore.hasProjects.value" class="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        暂无项目，点击“新建项目”开始。
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card v-for="project in projectStore.projects.value" :key="project.id" class="flex flex-col">
          <CardHeader>
            <div class="flex items-start justify-between gap-2">
              <CardTitle class="line-clamp-1 text-base">{{ project.title || '未命名项目' }}</CardTitle>
              <Badge variant="outline">{{ project.source_type }}</Badge>
            </div>
            <CardDescription class="line-clamp-2">
              {{ project.description || '暂无描述' }}
            </CardDescription>
          </CardHeader>
          <CardContent class="mt-auto space-y-3">
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ project.node_count }} 个节点</span>
              <span>更新于 {{ formatDate(project.updated_at) }}</span>
            </div>
            <Button class="w-full" variant="outline" @click="openProject(project.id)">
              <FolderOpen class="mr-2 h-4 w-4" />
              打开项目
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

