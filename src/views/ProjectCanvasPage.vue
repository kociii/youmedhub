<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Bot,
  FileText,
  Image as ImageIcon,
  Save,
  Share2,
  StickyNote,
  Type,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import { useProjects } from '@/composables/useProjects'
import { useVideoAnalysis } from '@/composables/useVideoAnalysis'
import { runProjectAiCard } from '@/api/projectAi'
import { useProjectModelRegistry } from '@/composables/useProjectModelRegistry'
import type {
  AiCallCardResult,
  AiCardOutputType,
  AiModelCategory,
  ProjectAiCallNode,
  ProjectCanvasNode,
  ProjectCanvasState,
  ProjectImageNode,
  ProjectNoteNode,
  ProjectScriptNode,
  ProjectTextNode,
  ProjectVideoNode,
} from '@/projects/types'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type ProjectInputNode = ProjectScriptNode | ProjectTextNode | ProjectImageNode | ProjectVideoNode | ProjectNoteNode

const route = useRoute()
const router = useRouter()
const projectStore = useProjects()
const va = useVideoAnalysis()
const modelRegistry = useProjectModelRegistry()
const { toast } = useToast()

const loading = ref(true)
const saving = ref(false)
const sharing = ref(false)
const projectTitle = ref('')
const sourceType = ref('')
const selectedNodeId = ref('')
const nodes = ref<ProjectCanvasNode[]>([])
const viewport = ref({ x: 40, y: 40, zoom: 1 })

const canvasHostRef = ref<HTMLElement | null>(null)
const interactionState = ref<{
  mode: 'idle' | 'pan' | 'drag'
  startX: number
  startY: number
  viewportX: number
  viewportY: number
  dragNodeId: string
  nodeX: number
  nodeY: number
}>({
  mode: 'idle',
  startX: 0,
  startY: 0,
  viewportX: 0,
  viewportY: 0,
  dragNodeId: '',
  nodeX: 0,
  nodeY: 0,
})

const projectId = computed(() => String(route.params.id || ''))
const zoomPercent = computed(() => `${Math.round(viewport.value.zoom * 100)}%`)
const aiOutputTypeOptions: AiCardOutputType[] = ['text', 'markdown', 'json', 'image', 'video', 'script']

const nodePalette = [
  { type: 'script', label: '脚本', icon: FileText },
  { type: 'text', label: '文本', icon: Type },
  { type: 'image', label: '图片', icon: ImageIcon },
  { type: 'video', label: '视频', icon: Video },
  { type: 'note', label: '便签', icon: StickyNote },
  { type: 'ai_call', label: 'AI', icon: Bot },
] as const

const selectedNode = computed(() => nodes.value.find(item => item.id === selectedNodeId.value) || null)
const selectedAiNode = computed(() => {
  if (!selectedNode.value || selectedNode.value.type !== 'ai_call') return null
  return selectedNode.value
})
const selectedAiModelOptions = computed(() => {
  if (!selectedAiNode.value) return []
  return modelRegistry.listModelsByCategory(selectedAiNode.value.data.config.modelCategory)
})

const canvasStyle = computed(() => ({
  transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
  transformOrigin: '0 0',
}))

function normalizeLoadedNodes(rawNodes: ProjectCanvasNode[]): ProjectCanvasNode[] {
  return rawNodes.map(node => {
    if (node.type !== 'ai_call') return node
    const config = node.data.config
    const nextCategory = config.modelCategory || 'text'
    const nextModelId = config.modelId || getDefaultModelId(nextCategory)
    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...config,
          modelCategory: nextCategory,
          modelId: nextModelId,
        },
        result: {
          ...node.data.result,
          status: node.data.result.status || 'idle',
          outputType: node.data.result.outputType || config.outputType || 'text',
          content: node.data.result.content ?? '',
        },
      },
    }
  })
}

function buildInitialNodePosition(): { x: number; y: number } {
  const host = canvasHostRef.value
  if (!host) return { x: 80, y: 80 }
  const centerX = host.clientWidth / 2
  const centerY = host.clientHeight / 2
  return {
    x: (centerX - viewport.value.x) / viewport.value.zoom - 140,
    y: (centerY - viewport.value.y) / viewport.value.zoom - 70,
  }
}

function getDefaultModelId(category: AiModelCategory): string {
  const enabled = modelRegistry.listModelsByCategory(category)
  if (enabled.length) {
    return enabled[0].id
  }
  return va.selectedModel.value?.id || ''
}

function isScriptNode(node: ProjectCanvasNode): node is ProjectScriptNode {
  return node.type === 'script'
}

function isTextNode(node: ProjectCanvasNode): node is ProjectTextNode {
  return node.type === 'text'
}

function isImageNode(node: ProjectCanvasNode): node is ProjectImageNode {
  return node.type === 'image'
}

function isVideoNode(node: ProjectCanvasNode): node is ProjectVideoNode {
  return node.type === 'video'
}

function isNoteNode(node: ProjectCanvasNode): node is ProjectNoteNode {
  return node.type === 'note'
}

function isAiCallNode(node: ProjectCanvasNode): node is ProjectAiCallNode {
  return node.type === 'ai_call'
}

function markAiResultDirty(node: ProjectAiCallNode) {
  if (node.data.result.status === 'running' || node.data.result.status === 'idle') return
  node.data.result.status = 'dirty'
}

function createNode(type: (typeof nodePalette)[number]['type']): ProjectCanvasNode {
  const position = buildInitialNodePosition()
  const nodeId = `${type}_${Date.now()}`

  if (type === 'script') {
    return {
      id: nodeId,
      type: 'script',
      x: position.x,
      y: position.y,
        width: 420,
        height: 220,
      data: {
        sequenceNumber: 0,
        shotType: '',
        cameraMovement: '',
        visualContent: '',
        voiceover: '',
        duration: '',
        startTime: '',
        endTime: '',
      },
    }
  }

  if (type === 'text') {
    return {
      id: nodeId,
      type: 'text',
      x: position.x,
      y: position.y,
      width: 320,
      height: 180,
      data: {
        title: '文本卡片',
        format: 'plain',
        content: '',
      },
    }
  }

  if (type === 'image') {
    return {
      id: nodeId,
      type: 'image',
      x: position.x,
      y: position.y,
      width: 320,
      height: 220,
      data: {
        title: '图片卡片',
        caption: '',
        asset: {
          provider: 'aliyun-oss',
        },
      },
    }
  }

  if (type === 'video') {
    return {
      id: nodeId,
      type: 'video',
      x: position.x,
      y: position.y,
      width: 340,
      height: 220,
      data: {
        title: '视频卡片',
        caption: '',
        asset: {
          provider: 'aliyun-oss',
        },
      },
    }
  }

  if (type === 'note') {
    return {
      id: nodeId,
      type: 'note',
      x: position.x,
      y: position.y,
      width: 280,
      height: 140,
      data: {
        content: '在这里记录拍摄提醒或创意方向。',
      },
    }
  }

  return {
    id: nodeId,
    type: 'ai_call',
    x: position.x,
    y: position.y,
    width: 380,
    height: 300,
    data: {
      title: 'AI 调用',
      config: {
        modelCategory: 'text',
        modelId: getDefaultModelId('text'),
        promptTemplate: '请根据输入内容生成输出',
        inputBindings: [],
        outputType: 'text',
      },
      result: {
        status: 'idle',
        outputType: 'text',
        content: '',
      },
    },
  }
}

function addNode(type: (typeof nodePalette)[number]['type']) {
  const newNode = createNode(type)
  nodes.value.push(newNode)
  selectedNodeId.value = newNode.id
}

function removeSelectedNode() {
  if (!selectedNode.value) return
  nodes.value = nodes.value.filter(item => item.id !== selectedNode.value?.id)
  selectedNodeId.value = ''
}

async function loadProject() {
  loading.value = true
  try {
    const project = await projectStore.getProjectById(projectId.value)
    projectTitle.value = project.title || '未命名项目'
    sourceType.value = project.source_type

    const latestSnapshot = await projectStore.getLatestSnapshot(projectId.value)
    const state = latestSnapshot?.canvas_state as ProjectCanvasState | undefined
    nodes.value = normalizeLoadedNodes(state?.nodes || [])
    viewport.value = state?.viewport || { x: 40, y: 40, zoom: 1 }
  } catch (error) {
    toast({
      title: '加载项目失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

function onBackgroundPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  if ((event.target as HTMLElement)?.closest('[data-role="project-node"]')) return
  selectedNodeId.value = ''
  interactionState.value = {
    mode: 'pan',
    startX: event.clientX,
    startY: event.clientY,
    viewportX: viewport.value.x,
    viewportY: viewport.value.y,
    dragNodeId: '',
    nodeX: 0,
    nodeY: 0,
  }
}

function onNodePointerDown(event: PointerEvent, node: ProjectCanvasNode) {
  if (event.button !== 0) return
  event.stopPropagation()
  selectedNodeId.value = node.id
  interactionState.value = {
    mode: 'drag',
    startX: event.clientX,
    startY: event.clientY,
    viewportX: viewport.value.x,
    viewportY: viewport.value.y,
    dragNodeId: node.id,
    nodeX: node.x,
    nodeY: node.y,
  }
}

function onPointerMove(event: PointerEvent) {
  if (interactionState.value.mode === 'idle') return

  if (interactionState.value.mode === 'pan') {
    const deltaX = event.clientX - interactionState.value.startX
    const deltaY = event.clientY - interactionState.value.startY
    viewport.value.x = interactionState.value.viewportX + deltaX
    viewport.value.y = interactionState.value.viewportY + deltaY
    return
  }

  const targetNode = nodes.value.find(node => node.id === interactionState.value.dragNodeId)
  if (!targetNode) return
  const deltaX = (event.clientX - interactionState.value.startX) / viewport.value.zoom
  const deltaY = (event.clientY - interactionState.value.startY) / viewport.value.zoom
  targetNode.x = interactionState.value.nodeX + deltaX
  targetNode.y = interactionState.value.nodeY + deltaY
}

function onPointerUp() {
  interactionState.value.mode = 'idle'
}

function onWheel(event: WheelEvent) {
  const host = canvasHostRef.value
  if (!host) return
  event.preventDefault()

  const rect = host.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top
  const prevZoom = viewport.value.zoom
  const nextZoom = Math.min(2.5, Math.max(0.3, prevZoom * (event.deltaY < 0 ? 1.1 : 0.9)))
  const worldX = (localX - viewport.value.x) / prevZoom
  const worldY = (localY - viewport.value.y) / prevZoom

  viewport.value.zoom = nextZoom
  viewport.value.x = localX - worldX * nextZoom
  viewport.value.y = localY - worldY * nextZoom
}

function adjustZoom(delta: number) {
  viewport.value.zoom = Math.min(2.5, Math.max(0.3, viewport.value.zoom + delta))
}

function resetView() {
  viewport.value = { x: 40, y: 40, zoom: 1 }
}

function getNodeStyle(node: ProjectCanvasNode) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    minHeight: `${node.height}px`,
  }
}

function updateAiCategory(node: ProjectAiCallNode, category: AiModelCategory) {
  node.data.config.modelCategory = category
  node.data.config.modelId = getDefaultModelId(category)
  markAiResultDirty(node)
}

function updateAiModel(node: ProjectAiCallNode, modelId: string) {
  node.data.config.modelId = modelId
  markAiResultDirty(node)
}

function updateAiOutputType(node: ProjectAiCallNode, outputType: AiCardOutputType) {
  node.data.config.outputType = outputType
  node.data.result.outputType = outputType
  markAiResultDirty(node)
}

function updateAiPromptTemplate(node: ProjectAiCallNode, promptTemplate: string) {
  node.data.config.promptTemplate = promptTemplate
  markAiResultDirty(node)
}

function buildAiInputContext(nodeId: string): string {
  const inputNodes = nodes.value.filter((node): node is ProjectInputNode => {
    return node.id !== nodeId && node.type !== 'ai_call'
  })
  const limitedNodes = inputNodes.slice(0, 6)
  if (!limitedNodes.length) {
    return '当前无可用输入节点。'
  }

  return limitedNodes.map((node, index) => {
    if (node.type === 'script') {
      return [
        `节点${index + 1}（script）`,
        `景别:${node.data.shotType || '-'}`,
        `运镜:${node.data.cameraMovement || '-'}`,
        `画面:${node.data.visualContent || '-'}`,
        `口播:${node.data.voiceover || '-'}`,
      ].join('\n')
    }
    if (node.type === 'text') {
      return [
        `节点${index + 1}（text）`,
        `标题:${node.data.title || '-'}`,
        `内容:${node.data.content || '-'}`,
      ].join('\n')
    }
    if (node.type === 'note') {
      return [
        `节点${index + 1}（note）`,
        `内容:${node.data.content || '-'}`,
      ].join('\n')
    }
    if (node.type === 'image') {
      return [
        `节点${index + 1}（image）`,
        `标题:${node.data.title || '-'}`,
        `说明:${node.data.caption || '-'}`,
        `资源:${node.data.asset.url || node.data.asset.objectKey || '-'}`,
      ].join('\n')
    }
    return [
      `节点${index + 1}（video）`,
      `标题:${node.data.title || '-'}`,
      `说明:${node.data.caption || '-'}`,
      `资源:${node.data.asset.url || node.data.asset.objectKey || '-'}`,
    ].join('\n')
  }).join('\n\n')
}

async function runAiCard(nodeId: string) {
  const node = nodes.value.find(item => item.id === nodeId)
  if (!node || !isAiCallNode(node)) return

  if (!va.currentApiKey.value) {
    toast({
      title: '缺少 API Key',
      description: '请先在设置页配置阿里百炼 API Key',
      variant: 'destructive',
    })
    return
  }

  if (!node.data.config.modelId) {
    node.data.result.status = 'error'
    node.data.result.errorCode = 'missing_model_id'
    node.data.result.errorMessage = '请先选择模型'
    return
  }

  if (!modelRegistry.isModelEnabled(node.data.config.modelId)) {
    node.data.result.status = 'error'
    node.data.result.errorCode = 'model_disabled'
    node.data.result.errorMessage = '当前模型已下线，无法执行，请重新选择可用模型'
    return
  }

  node.data.result = {
    ...node.data.result,
    status: 'running',
    outputType: node.data.config.outputType,
    errorCode: '',
    errorMessage: '',
  }

  try {
    const inputContext = buildAiInputContext(node.id)
    const response = await runProjectAiCard({
      apiKey: va.currentApiKey.value,
      modelId: node.data.config.modelId,
      outputType: node.data.config.outputType,
      promptTemplate: node.data.config.promptTemplate,
      inputContext,
    })

    const nextResult: AiCallCardResult = {
      status: 'success',
      outputType: response.outputType,
      content: response.content,
      usage: response.usage,
      finishedAt: new Date().toISOString(),
    }
    node.data.result = nextResult
  } catch (error) {
    node.data.result = {
      ...node.data.result,
      status: 'error',
      errorCode: 'provider_error',
      errorMessage: error instanceof Error ? error.message : '执行失败',
    }
  }
}

function formatAiResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

async function saveSnapshot() {
  saving.value = true
  try {
    await projectStore.saveProjectSnapshot(projectId.value, {
      title: `手动保存 ${new Date().toLocaleString('zh-CN')}`,
      snapshotType: 'manual_save',
      canvasState: {
        nodes: nodes.value,
        viewport: viewport.value,
      },
    })
    toast({
      title: '保存成功',
      description: '已生成新的项目快照',
    })
  } catch (error) {
    toast({
      title: '保存失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    saving.value = false
  }
}

function goToProjects() {
  router.push('/projects')
}

async function publishShare() {
  sharing.value = true
  try {
    const latestSnapshot = await projectStore.getLatestSnapshot(projectId.value)
    const share = await projectStore.publishProjectShare(projectId.value, {
      title: projectTitle.value || '项目分享',
      summary: `公开分享 · ${new Date().toLocaleString('zh-CN')}`,
      snapshotId: latestSnapshot?.id || null,
      sharePayload: {
        title: projectTitle.value,
        sourceType: sourceType.value,
        canvasState: {
          nodes: nodes.value,
          viewport: viewport.value,
        },
        publishedAt: new Date().toISOString(),
      },
    })

    const shareUrl = `${window.location.origin}/share/projects/${share.share_token}`
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
    }
    toast({
      title: '分享链接已生成',
      description: '已复制到剪贴板，可直接发送给他人查看。',
    })
  } catch (error) {
    toast({
      title: '生成分享失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  } finally {
    sharing.value = false
  }
}

async function openShare() {
  try {
    const share = await projectStore.getProjectShare(projectId.value)
    if (!share?.share_token) {
      toast({
        title: '请先生成分享链接',
        description: '先点击“公开分享”后再打开分享页。',
      })
      return
    }
    window.open(`/share/projects/${share.share_token}`, '_blank', 'noopener')
  } catch (error) {
    toast({
      title: '打开分享失败',
      description: error instanceof Error ? error.message : '未知错误',
      variant: 'destructive',
    })
  }
}

onMounted(async () => {
  modelRegistry.loadRegistry()
  await loadProject()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="flex h-screen flex-col bg-background">
    <header class="z-20 flex h-14 items-center gap-3 border-b bg-card px-4">
      <Button variant="outline" size="sm" @click="goToProjects">
        <ArrowLeft class="mr-1.5 h-4 w-4" />
        返回项目
      </Button>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium">{{ projectTitle }}</div>
        <div class="text-xs text-muted-foreground">来源：{{ sourceType || 'manual' }}</div>
      </div>
      <Badge variant="secondary">{{ zoomPercent }}</Badge>
      <Button variant="outline" size="sm" @click="adjustZoom(-0.1)">
        <ZoomOut class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" @click="adjustZoom(0.1)">
        <ZoomIn class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" @click="resetView">重置视图</Button>
      <Button variant="outline" size="sm" :disabled="sharing || loading" @click="publishShare">
        <Share2 class="mr-1.5 h-4 w-4" />
        {{ sharing ? '生成中...' : '公开分享' }}
      </Button>
      <Button variant="outline" size="sm" :disabled="loading" @click="openShare">
        打开分享页
      </Button>
      <Button size="sm" :disabled="saving || loading" @click="saveSnapshot">
        <Save class="mr-1.5 h-4 w-4" />
        {{ saving ? '保存中...' : '保存快照' }}
      </Button>
    </header>

    <div class="grid min-h-0 flex-1 grid-cols-[84px_minmax(0,1fr)_340px]">
      <aside class="border-r bg-card p-2">
        <div class="mb-2 px-1 text-[11px] text-muted-foreground">节点</div>
        <div class="space-y-2">
          <button
            v-for="item in nodePalette"
            :key="item.type"
            class="flex w-full flex-col items-center gap-1 rounded border px-1 py-2 text-[11px] transition hover:bg-accent"
            @click="addNode(item.type)"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span class="leading-none">{{ item.label }}</span>
          </button>
        </div>
      </aside>

      <main
        ref="canvasHostRef"
        class="relative min-h-0 overflow-hidden bg-muted/20"
        @pointerdown="onBackgroundPointerDown"
        @wheel="onWheel"
      >
        <div v-if="loading" class="flex h-full items-center justify-center text-muted-foreground">
          正在加载项目画布...
        </div>

        <div v-else class="absolute inset-0">
          <div class="absolute inset-0 bg-[radial-gradient(circle,_rgba(148,163,184,0.35)_1px,_transparent_1px)] bg-[size:20px_20px]" />
          <div class="absolute left-0 top-0 h-full w-full will-change-transform" :style="canvasStyle">
            <article
              v-for="node in nodes"
              :key="node.id"
              data-role="project-node"
              class="absolute cursor-move rounded-lg border bg-card p-3 shadow-sm"
              :class="selectedNodeId === node.id ? 'border-primary ring-1 ring-primary/50' : ''"
              :style="getNodeStyle(node)"
              @pointerdown="onNodePointerDown($event, node)"
            >
              <template v-if="isScriptNode(node)">
                <div class="text-sm font-medium">脚本 #{{ String(node.data.sequenceNumber || '-') }}</div>
                <div class="mt-1 text-xs text-muted-foreground">
                  {{ node.data.shotType || '未标注景别' }} · {{ node.data.cameraMovement || '未标注运镜' }}
                </div>
                <div class="mt-2 line-clamp-3 text-xs">{{ node.data.visualContent || '无画面内容' }}</div>
                <div class="mt-2 line-clamp-2 text-xs text-muted-foreground">口播：{{ node.data.voiceover || '无口播' }}</div>
              </template>

              <template v-else-if="isTextNode(node)">
                <div class="text-sm font-medium">{{ node.data.title || '文本卡片' }}</div>
                <div class="mt-1 text-[11px] text-muted-foreground">格式：{{ node.data.format }}</div>
                <div class="mt-2 line-clamp-4 whitespace-pre-wrap text-xs">{{ node.data.content || '暂无内容' }}</div>
              </template>

              <template v-else-if="isImageNode(node)">
                <div class="text-sm font-medium">{{ node.data.title || '图片卡片' }}</div>
                <div class="mt-1 text-[11px] text-muted-foreground">
                  {{ node.data.asset.url || node.data.asset.objectKey || '未设置图片资源' }}
                </div>
                <div class="mt-2 line-clamp-3 text-xs">{{ node.data.caption || '暂无说明' }}</div>
              </template>

              <template v-else-if="isVideoNode(node)">
                <div class="text-sm font-medium">{{ node.data.title || '视频卡片' }}</div>
                <div class="mt-1 text-[11px] text-muted-foreground">
                  {{ node.data.asset.url || node.data.asset.objectKey || '未设置视频资源' }}
                </div>
                <div class="mt-2 line-clamp-3 text-xs">{{ node.data.caption || '暂无说明' }}</div>
              </template>

              <template v-else-if="isNoteNode(node)">
                <div class="text-sm font-medium">NOTE</div>
                <p class="mt-2 text-xs text-muted-foreground">{{ String(node.data.content || '空白便签') }}</p>
              </template>

              <template v-else>
                <div class="flex items-center justify-between gap-2">
                  <div class="text-sm font-medium">{{ node.data.title }}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="node.data.result.status === 'running'"
                    @click.stop="runAiCard(node.id)"
                  >
                    {{ node.data.result.status === 'running' ? '运行中...' : '运行' }}
                  </Button>
                </div>
                <div class="mt-1 text-[11px] text-muted-foreground">
                  {{ node.data.config.modelCategory }} · {{ node.data.config.modelId || '未选择模型' }}
                </div>
                <div class="mt-1 text-[11px] text-muted-foreground">状态：{{ node.data.result.status }}</div>
                <div v-if="node.data.result.usage" class="mt-1 text-[11px] text-muted-foreground">
                  Token：输入 {{ node.data.result.usage.prompt_tokens }} · 输出 {{ node.data.result.usage.completion_tokens }}
                </div>
                <div class="mt-2 min-h-[96px] rounded border bg-muted/30 p-2 text-xs">
                  <div v-if="node.data.result.status === 'idle'" class="text-muted-foreground">
                    请在右侧配置模型并执行。
                  </div>
                  <div v-else-if="node.data.result.status === 'running'" class="text-muted-foreground">
                    AI 正在执行，请稍候...
                  </div>
                  <div v-else-if="node.data.result.status === 'error'" class="text-destructive">
                    {{ node.data.result.errorMessage || '执行失败' }}
                  </div>
                  <template v-else>
                    <pre class="whitespace-pre-wrap break-words">{{ formatAiResult(node.data.result.content) }}</pre>
                  </template>
                </div>
              </template>
            </article>
          </div>
        </div>
      </main>

      <aside class="flex min-h-0 flex-col border-l bg-card p-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-medium">属性面板</div>
          <Button v-if="selectedNode" size="sm" variant="outline" @click="removeSelectedNode">删除节点</Button>
        </div>

        <div v-if="!selectedNode" class="rounded border border-dashed p-3 text-xs text-muted-foreground">
          请选择一个节点，右侧会显示可编辑属性。
        </div>

        <div v-else class="space-y-3 overflow-y-auto pr-1 text-xs">
          <template v-if="isScriptNode(selectedNode)">
            <label class="block space-y-1">
              <span class="text-muted-foreground">镜头编号</span>
              <input v-model="selectedNode.data.sequenceNumber" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">画面内容</span>
              <textarea v-model="selectedNode.data.visualContent" class="h-24 w-full rounded border bg-background p-2" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">口播</span>
              <textarea v-model="selectedNode.data.voiceover" class="h-20 w-full rounded border bg-background p-2" />
            </label>
          </template>

          <template v-else-if="isTextNode(selectedNode)">
            <label class="block space-y-1">
              <span class="text-muted-foreground">标题</span>
              <input v-model="selectedNode.data.title" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">格式</span>
              <select v-model="selectedNode.data.format" class="w-full rounded border bg-background px-2 py-1.5">
                <option value="plain">plain</option>
                <option value="markdown">markdown</option>
              </select>
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">内容</span>
              <textarea v-model="selectedNode.data.content" class="h-36 w-full rounded border bg-background p-2" />
            </label>
          </template>

          <template v-else-if="isImageNode(selectedNode)">
            <label class="block space-y-1">
              <span class="text-muted-foreground">标题</span>
              <input v-model="selectedNode.data.title" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">OSS URL</span>
              <input v-model="selectedNode.data.asset.url" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">说明</span>
              <textarea v-model="selectedNode.data.caption" class="h-20 w-full rounded border bg-background p-2" />
            </label>
          </template>

          <template v-else-if="isVideoNode(selectedNode)">
            <label class="block space-y-1">
              <span class="text-muted-foreground">标题</span>
              <input v-model="selectedNode.data.title" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">OSS URL</span>
              <input v-model="selectedNode.data.asset.url" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>
            <label class="block space-y-1">
              <span class="text-muted-foreground">说明</span>
              <textarea v-model="selectedNode.data.caption" class="h-20 w-full rounded border bg-background p-2" />
            </label>
          </template>

          <template v-else-if="isNoteNode(selectedNode)">
            <label class="block space-y-1">
              <span class="text-muted-foreground">便签内容</span>
              <textarea v-model="selectedNode.data.content" class="h-28 w-full rounded border bg-background p-2" />
            </label>
          </template>

          <template v-else>
            <label class="block space-y-1">
              <span class="text-muted-foreground">标题</span>
              <input v-model="selectedNode.data.title" class="w-full rounded border bg-background px-2 py-1.5" />
            </label>

            <label class="block space-y-1">
              <span class="text-muted-foreground">模型类型</span>
              <select
                class="w-full rounded border bg-background px-2 py-1.5"
                :value="selectedNode.data.config.modelCategory"
                @change="updateAiCategory(selectedNode, ($event.target as HTMLSelectElement).value as AiModelCategory)"
              >
                <option value="text">text</option>
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </label>

            <label class="block space-y-1">
              <span class="text-muted-foreground">模型</span>
              <select
                class="w-full rounded border bg-background px-2 py-1.5"
                :value="selectedNode.data.config.modelId"
                @change="updateAiModel(selectedNode, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">请选择模型</option>
                <option v-for="model in selectedAiModelOptions" :key="model.id" :value="model.id">
                  {{ model.name }}
                </option>
              </select>
            </label>

            <div
              v-if="selectedNode.data.config.modelId && !modelRegistry.isModelEnabled(selectedNode.data.config.modelId)"
              class="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-700"
            >
              历史模型已下线，可查看历史结果，但重新运行会报错。
            </div>

            <label class="block space-y-1">
              <span class="text-muted-foreground">输出类型</span>
              <select
                class="w-full rounded border bg-background px-2 py-1.5"
                :value="selectedNode.data.config.outputType"
                @change="updateAiOutputType(selectedNode, ($event.target as HTMLSelectElement).value as AiCardOutputType)"
              >
                <option v-for="option in aiOutputTypeOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>

            <label class="block space-y-1">
              <span class="text-muted-foreground">提示词模板</span>
              <textarea
                class="h-28 w-full rounded border bg-background p-2"
                :value="selectedNode.data.config.promptTemplate"
                @input="updateAiPromptTemplate(selectedNode, ($event.target as HTMLTextAreaElement).value)"
              />
            </label>

            <div class="rounded border bg-muted/20 p-2 text-[11px] text-muted-foreground">
              状态：{{ selectedNode.data.result.status }}
            </div>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>
