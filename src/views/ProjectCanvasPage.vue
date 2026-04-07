<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Code2,
  FileText,
  Film,
  ImagePlus,
  Maximize,
  Moon,
  Save,
  Sparkles,
  StickyNote,
  Sun,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import { useProjects } from '@/composables/useProjects'
import type { ProjectAssetRecord } from '@/composables/useProjects'
import { useProjectModelRegistry } from '@/composables/useProjectModelRegistry'
import { runProjectAiCard } from '@/api/projectAi'
import { parseUploadError, uploadImageFile, uploadVideoFile, validateVideoFile } from '@/api/temporaryFile'
import { DEFAULT_MODEL_ID } from '@/config/models'
import type {
  AiCardOutputType,
  AiModelCategory,
  ProjectAiCallNode,
  ProjectAssetRef,
  ProjectCanvasNode,
  ProjectCanvasState,
  ProjectImageNode,
  ProjectNodeType,
  ProjectNoteNode,
  ProjectScriptNode,
  ProjectTextNode,
  ProjectVideoNode,
} from '@/projects/types'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const route = useRoute()
const router = useRouter()
const projectStore = useProjects()
const { toast } = useToast()
const modelRegistry = useProjectModelRegistry()

const PROJECT_CANVAS_THEME_KEY = 'project_canvas_theme'

interface ProjectAssetLibraryItem {
  id: string
  type: 'image' | 'video'
  title: string
  createdAt: string
  asset: ProjectAssetRef
}

type InteractionMode = 'idle' | 'pan' | 'drag' | 'resize' | 'marquee'
type ResizeHandle = 'right' | 'bottom' | 'corner'

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const dragOver = ref(false)
const projectTitle = ref('')
const sourceType = ref('')
const selectedNodeId = ref('')
const selectedNodeIds = ref<string[]>([])
const nodes = ref<ProjectCanvasNode[]>([])
const viewport = ref({ x: 40, y: 40, zoom: 1 })
const theme = ref<'light' | 'dark'>('dark')
const isSpacePressed = ref(false)
const platformType = ref<'mac' | 'windows' | 'other'>('other')

const editingTextNodeId = ref('')
const editingNoteNodeId = ref('')
const editingAiPromptNodeId = ref('')
const aiConfigNodeId = ref('')
const mediaMenuNodeId = ref('')

const assetLibrary = ref<ProjectAssetLibraryItem[]>([])
const resourceDialogOpen = ref(false)
const resourceDialogNodeId = ref('')
const resourceDialogType = ref<'image' | 'video'>('image')
const mediaPreviewIndex = ref<Record<string, string>>({})

const pendingUploadNodeId = ref('')
const imageUploadInputRef = ref<HTMLInputElement | null>(null)
const videoUploadInputRef = ref<HTMLInputElement | null>(null)

const canvasHostRef = ref<HTMLElement | null>(null)
const interactionState = ref<{
  mode: InteractionMode
  startX: number
  startY: number
  viewportX: number
  viewportY: number
  dragNodeId: string
  nodeX: number
  nodeY: number
  nodeWidth: number
  nodeHeight: number
  resizeHandle: ResizeHandle
}>({
  mode: 'idle',
  startX: 0,
  startY: 0,
  viewportX: 0,
  viewportY: 0,
  dragNodeId: '',
  nodeX: 0,
  nodeY: 0,
  nodeWidth: 0,
  nodeHeight: 0,
  resizeHandle: 'corner',
})
const marqueeState = ref({
  active: false,
  startClientX: 0,
  startClientY: 0,
  currentClientX: 0,
  currentClientY: 0,
  startWorldX: 0,
  startWorldY: 0,
  currentWorldX: 0,
  currentWorldY: 0,
})
const lastContextToastAt = ref(0)
const gestureState = ref({
  active: false,
  startZoom: 1,
  startViewportX: 0,
  startViewportY: 0,
  anchorLocalX: 0,
  anchorLocalY: 0,
})

const projectId = computed(() => String(route.params.id || ''))
const zoomPercent = computed(() => `${Math.round(viewport.value.zoom * 100)}%`)
const isMacOS = computed(() => platformType.value === 'mac')
const isWindowsOS = computed(() => platformType.value === 'windows')
const selectedNode = computed(() => {
  const primaryId = selectedNodeIds.value[0] || selectedNodeId.value
  return nodes.value.find(item => item.id === primaryId) || null
})
const isDarkMode = computed(() => theme.value === 'dark')
const canvasThemeClass = computed(() => {
  if (isDarkMode.value) {
    return 'bg-[#141a27] text-slate-100'
  }
  return 'bg-[#f7f8fb] text-slate-900'
})

const canvasStyle = computed<Record<string, string>>(() => ({
  transform: `translate3d(${viewport.value.x}px, ${viewport.value.y}px, 0) scale(${viewport.value.zoom})`,
  transformOrigin: '0 0',
  willChange: 'transform',
}))
const marqueeStyle = computed(() => {
  const left = Math.min(marqueeState.value.startClientX, marqueeState.value.currentClientX)
  const top = Math.min(marqueeState.value.startClientY, marqueeState.value.currentClientY)
  const width = Math.abs(marqueeState.value.currentClientX - marqueeState.value.startClientX)
  const height = Math.abs(marqueeState.value.currentClientY - marqueeState.value.startClientY)
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

const currentApiKey = computed(() => {
  return localStorage.getItem('dashscope_api_key') || import.meta.env.VITE_DASHSCOPE_API_KEY || ''
})

const aiOutputTypeOptions: Array<{ value: AiCardOutputType; label: string }> = [
  { value: 'text', label: '文本' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'image', label: '图片描述' },
  { value: 'video', label: '视频描述' },
  { value: 'script', label: '脚本结构' },
]

const aiCategoryOptions: Array<{ value: AiModelCategory; label: string }> = [
  { value: 'text', label: '文本模型' },
  { value: 'image', label: '图像模型' },
  { value: 'video', label: '视频模型' },
]

const leftCreateActions: Array<{ type: ProjectNodeType; label: string; icon: unknown }> = [
  { type: 'text', label: '文本', icon: FileText },
  { type: 'image', label: '图片', icon: ImagePlus },
  { type: 'video', label: '视频', icon: Film },
  { type: 'script', label: '脚本', icon: Code2 },
  { type: 'ai_call', label: 'AI', icon: Sparkles },
  { type: 'note', label: '便签', icon: StickyNote },
]

const filteredLibraryItems = computed(() => assetLibrary.value.filter(item => item.type === resourceDialogType.value))

function isScriptNode(node: ProjectCanvasNode): node is ProjectScriptNode {
  return node.type === 'script'
}

function isNoteNode(node: ProjectCanvasNode): node is ProjectNoteNode {
  return node.type === 'note'
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

function isAiNode(node: ProjectCanvasNode): node is ProjectAiCallNode {
  return node.type === 'ai_call'
}

function getMediaAspectRatio(node: ProjectCanvasNode): number {
  if (!isImageNode(node) && !isVideoNode(node)) return 0
  const width = Number(node.data.asset.width || 0)
  const height = Number(node.data.asset.height || 0)
  if (!width || !height) return 0
  return width / height
}

function normalizeMediaNodeSize(node: ProjectCanvasNode, mode: 'keep_width' | 'keep_height' = 'keep_width') {
  if (!isImageNode(node) && !isVideoNode(node)) return
  const ratio = getMediaAspectRatio(node)
  if (!ratio) return

  const minWidth = 220
  const minHeight = 140
  if (mode === 'keep_height') {
    node.height = Math.max(minHeight, node.height)
    node.width = Math.max(minWidth, node.height * ratio)
    return
  }
  node.width = Math.max(minWidth, node.width)
  node.height = Math.max(minHeight, node.width / ratio)
}

function normalizeLoadedNodes(rawNodes: ProjectCanvasNode[]): ProjectCanvasNode[] {
  return rawNodes.map((node) => {
    const normalized = {
      ...node,
      width: node.width || getDefaultNodeSize(node.type).width,
      height: node.height || getDefaultNodeSize(node.type).height,
    }
    normalizeMediaNodeSize(normalized, 'keep_width')
    return normalized
  })
}

function getDefaultNodeSize(type: ProjectNodeType): { width: number; height: number } {
  if (type === 'note') return { width: 280, height: 160 }
  if (type === 'text') return { width: 320, height: 180 }
  if (type === 'image') return { width: 360, height: 240 }
  if (type === 'video') return { width: 400, height: 260 }
  if (type === 'ai_call') return { width: 460, height: 320 }
  return { width: 420, height: 220 }
}

function buildInitialNodePosition(): { x: number; y: number } {
  const host = canvasHostRef.value
  if (!host) return { x: 80, y: 80 }
  const centerX = host.clientWidth / 2
  const centerY = host.clientHeight / 2
  return {
    x: (centerX - viewport.value.x) / viewport.value.zoom - 160,
    y: (centerY - viewport.value.y) / viewport.value.zoom - 100,
  }
}

function createNode(type: ProjectNodeType, position?: { x: number; y: number }): ProjectCanvasNode {
  const resolvedPosition = position || buildInitialNodePosition()
  const size = getDefaultNodeSize(type)

  if (type === 'text') {
    return {
      id: `text_${Date.now()}`,
      type: 'text',
      x: resolvedPosition.x,
      y: resolvedPosition.y,
      width: size.width,
      height: size.height,
      data: {
        title: '文本节点',
        format: 'plain',
        content: '双击编辑文本内容',
      },
    }
  }

  if (type === 'image') {
    return {
      id: `image_${Date.now()}`,
      type: 'image',
      x: resolvedPosition.x,
      y: resolvedPosition.y,
      width: size.width,
      height: size.height,
      data: {
        title: '图片节点',
        caption: '',
        asset: {
          provider: 'aliyun-oss',
        },
      },
    }
  }

  if (type === 'video') {
    return {
      id: `video_${Date.now()}`,
      type: 'video',
      x: resolvedPosition.x,
      y: resolvedPosition.y,
      width: size.width,
      height: size.height,
      data: {
        title: '视频节点',
        caption: '',
        asset: {
          provider: 'aliyun-oss',
        },
      },
    }
  }

  if (type === 'note') {
    return {
      id: `note_${Date.now()}`,
      type: 'note',
      x: resolvedPosition.x,
      y: resolvedPosition.y,
      width: size.width,
      height: size.height,
      data: {
        content: '双击编辑便签内容',
      },
    }
  }

  if (type === 'ai_call') {
    return {
      id: `ai_${Date.now()}`,
      type: 'ai_call',
      x: resolvedPosition.x,
      y: resolvedPosition.y,
      width: size.width,
      height: size.height,
      data: {
        title: 'AI 节点',
        config: {
          modelCategory: 'text',
          modelId: DEFAULT_MODEL_ID,
          promptTemplate: '请根据输入上下文输出可执行文案。',
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

  return {
    id: `script_${Date.now()}`,
    type: 'script',
    x: resolvedPosition.x,
    y: resolvedPosition.y,
    width: size.width,
    height: size.height,
    data: {
      sequenceNumber: 1,
      shotType: '未标注景别',
      cameraMovement: '未标注运镜',
      visualContent: '双击或在右侧属性面板编辑脚本内容',
      voiceover: '',
      duration: '00:05',
      startTime: '00:00',
      endTime: '00:05',
    },
  }
}

function isNodeOverlap(
  candidate: { x: number; y: number; width: number; height: number },
  existing: { x: number; y: number; width: number; height: number },
  padding = 20,
) {
  return !(
    candidate.x + candidate.width + padding <= existing.x ||
    existing.x + existing.width + padding <= candidate.x ||
    candidate.y + candidate.height + padding <= existing.y ||
    existing.y + existing.height + padding <= candidate.y
  )
}

function findNonOverlappingPosition(
  start: { x: number; y: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  const step = 36
  const maxAttempts = 120

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const ring = Math.floor(Math.sqrt(attempt))
    const offsetX = ((attempt % (ring + 1)) - ring / 2) * step
    const offsetY = (ring - Math.floor(attempt / (ring + 1))) * step
    const candidate = {
      x: Math.round(start.x + offsetX),
      y: Math.round(start.y + offsetY),
      width: size.width,
      height: size.height,
    }
    const hasOverlap = nodes.value.some(node => isNodeOverlap(candidate, node))
    if (!hasOverlap) {
      return { x: candidate.x, y: candidate.y }
    }
  }

  return start
}

function addNode(type: ProjectNodeType, position?: { x: number; y: number }, avoidOverlap = true) {
  const newNode = createNode(type, position)
  if (avoidOverlap) {
    const nextPosition = findNonOverlappingPosition(
      { x: newNode.x, y: newNode.y },
      { width: newNode.width, height: newNode.height },
    )
    newNode.x = nextPosition.x
    newNode.y = nextPosition.y
  }
  nodes.value.push(newNode)
  selectedNodeId.value = newNode.id
  selectedNodeIds.value = [newNode.id]
  if (newNode.type === 'image' || newNode.type === 'video') {
    mediaMenuNodeId.value = newNode.id
  }
}

function removeNodeById(nodeId: string) {
  nodes.value = nodes.value.filter(item => item.id !== nodeId)
  selectedNodeIds.value = selectedNodeIds.value.filter(id => id !== nodeId)
  if (selectedNodeId.value === nodeId) {
    selectedNodeId.value = ''
  }
}

function removeSelectedNode() {
  if (!selectedNode.value) return
  removeNodeById(selectedNode.value.id)
}

function removeSelectedNodes() {
  if (!selectedNodeIds.value.length) return
  const selectedSet = new Set(selectedNodeIds.value)
  nodes.value = nodes.value.filter(item => !selectedSet.has(item.id))
  selectedNodeIds.value = []
  selectedNodeId.value = ''
}

function getNodeById(nodeId: string): ProjectCanvasNode | null {
  return nodes.value.find(item => item.id === nodeId) || null
}

function loadTheme() {
  const stored = localStorage.getItem(PROJECT_CANVAS_THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    theme.value = stored
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(PROJECT_CANVAS_THEME_KEY, theme.value)
}

function parseOssLocation(ossUrl: string): { bucket: string; objectKey: string } {
  const normalized = ossUrl.replace(/^oss:\/\//, '')
  const slashIndex = normalized.indexOf('/')
  if (slashIndex === -1) {
    return {
      bucket: normalized || 'dashscope-temp',
      objectKey: normalized,
    }
  }
  return {
    bucket: normalized.slice(0, slashIndex) || 'dashscope-temp',
    objectKey: normalized.slice(slashIndex + 1),
  }
}

function mapAssetRecordToLibraryItem(record: ProjectAssetRecord): ProjectAssetLibraryItem | null {
  if (record.asset_type !== 'image' && record.asset_type !== 'video') {
    return null
  }
  return {
    id: record.id,
    type: record.asset_type,
    title: record.file_name || `${record.asset_type === 'image' ? '图片' : '视频'}资源`,
    createdAt: record.created_at,
    asset: {
      assetId: record.id,
      provider: 'aliyun-oss',
      bucket: record.bucket,
      objectKey: record.object_key,
      url: record.public_url || record.oss_url || '',
      mimeType: record.mime_type,
      sizeBytes: record.size_bytes,
      width: record.width,
      height: record.height,
      durationMs: record.duration_ms,
    },
  }
}

async function loadAssetLibrary() {
  try {
    const [imageAssets, videoAssets] = await Promise.all([
      projectStore.listProjectAssets({ assetType: 'image', limit: 150 }),
      projectStore.listProjectAssets({ assetType: 'video', limit: 150 }),
    ])
    const mapped = [...imageAssets, ...videoAssets]
      .map(mapAssetRecordToLibraryItem)
      .filter((item): item is ProjectAssetLibraryItem => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    assetLibrary.value = mapped
  } catch (error) {
    assetLibrary.value = []
    toast({
      title: '资源库加载失败',
      description: error instanceof Error ? error.message : '请稍后重试',
      variant: 'destructive',
    })
  }
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
  if (event.button !== 0 && event.button !== 1 && event.button !== 2) return
  if (event.button === 0 && (event.target as HTMLElement)?.closest('[data-role="project-node"]')) return

  if (event.button === 2) {
    event.preventDefault()
    const now = Date.now()
    if (now - lastContextToastAt.value > 1200) {
      toast({
        title: '画布属性功能开发中',
        description: '右键将用于画布属性操作，当前暂未开放。',
      })
      lastContextToastAt.value = now
    }
    return
  }

  const shouldPan = event.button === 1 || (event.button === 0 && isSpacePressed.value)
  if (shouldPan) {
    event.preventDefault()
    interactionState.value = {
      mode: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      viewportX: viewport.value.x,
      viewportY: viewport.value.y,
      dragNodeId: '',
      nodeX: 0,
      nodeY: 0,
      nodeWidth: 0,
      nodeHeight: 0,
      resizeHandle: 'corner',
    }
    return
  }

  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()

  selectedNodeId.value = ''
  selectedNodeIds.value = []
  mediaMenuNodeId.value = ''
  aiConfigNodeId.value = ''
  const world = getCanvasPositionFromClient(event.clientX, event.clientY)
  marqueeState.value = {
    active: true,
    startClientX: event.clientX,
    startClientY: event.clientY,
    currentClientX: event.clientX,
    currentClientY: event.clientY,
    startWorldX: world.x,
    startWorldY: world.y,
    currentWorldX: world.x,
    currentWorldY: world.y,
  }
  interactionState.value = {
    mode: 'marquee',
    startX: event.clientX,
    startY: event.clientY,
    viewportX: viewport.value.x,
    viewportY: viewport.value.y,
    dragNodeId: '',
    nodeX: 0,
    nodeY: 0,
    nodeWidth: 0,
    nodeHeight: 0,
    resizeHandle: 'corner',
  }
}

function onNodePointerDown(event: PointerEvent, node: ProjectCanvasNode) {
  if (event.button === 2) {
    event.preventDefault()
    event.stopPropagation()
    const now = Date.now()
    if (now - lastContextToastAt.value > 1200) {
      toast({
        title: '画布属性功能开发中',
        description: '右键将用于画布属性操作，当前暂未开放。',
      })
      lastContextToastAt.value = now
    }
    return
  }

  if (event.button === 1 || (event.button === 0 && isSpacePressed.value)) {
    event.preventDefault()
    event.stopPropagation()
    interactionState.value = {
      mode: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      viewportX: viewport.value.x,
      viewportY: viewport.value.y,
      dragNodeId: '',
      nodeX: 0,
      nodeY: 0,
      nodeWidth: 0,
      nodeHeight: 0,
      resizeHandle: 'corner',
    }
    return
  }

  if (event.button !== 0) return
  const target = event.target as HTMLElement
  if (target.closest('[data-no-drag="true"]')) return

  event.stopPropagation()
  selectedNodeId.value = node.id
  selectedNodeIds.value = [node.id]
  if (node.type === 'image' || node.type === 'video') {
    mediaMenuNodeId.value = node.id
  } else {
    mediaMenuNodeId.value = ''
  }

  interactionState.value = {
    mode: 'drag',
    startX: event.clientX,
    startY: event.clientY,
    viewportX: viewport.value.x,
    viewportY: viewport.value.y,
    dragNodeId: node.id,
    nodeX: node.x,
    nodeY: node.y,
    nodeWidth: node.width,
    nodeHeight: node.height,
    resizeHandle: 'corner',
  }
}

function onResizePointerDown(event: PointerEvent, node: ProjectCanvasNode, handle: ResizeHandle) {
  if (event.button !== 0) return
  event.stopPropagation()
  selectedNodeId.value = node.id
  selectedNodeIds.value = [node.id]
  interactionState.value = {
    mode: 'resize',
    startX: event.clientX,
    startY: event.clientY,
    viewportX: viewport.value.x,
    viewportY: viewport.value.y,
    dragNodeId: node.id,
    nodeX: node.x,
    nodeY: node.y,
    nodeWidth: node.width,
    nodeHeight: node.height,
    resizeHandle: handle,
  }
}

function onPointerMove(event: PointerEvent) {
  if (interactionState.value.mode === 'idle') return

  if (interactionState.value.mode === 'marquee') {
    marqueeState.value.currentClientX = event.clientX
    marqueeState.value.currentClientY = event.clientY
    const world = getCanvasPositionFromClient(event.clientX, event.clientY)
    marqueeState.value.currentWorldX = world.x
    marqueeState.value.currentWorldY = world.y
    return
  }

  if (interactionState.value.mode === 'pan') {
    const deltaX = event.clientX - interactionState.value.startX
    const deltaY = event.clientY - interactionState.value.startY
    viewport.value.x = Math.round(interactionState.value.viewportX + deltaX)
    viewport.value.y = Math.round(interactionState.value.viewportY + deltaY)
    return
  }

  const targetNode = nodes.value.find(node => node.id === interactionState.value.dragNodeId)
  if (!targetNode) return

  const deltaX = (event.clientX - interactionState.value.startX) / viewport.value.zoom
  const deltaY = (event.clientY - interactionState.value.startY) / viewport.value.zoom

  if (interactionState.value.mode === 'drag') {
    targetNode.x = interactionState.value.nodeX + deltaX
    targetNode.y = interactionState.value.nodeY + deltaY
    return
  }

  const minWidth = targetNode.type === 'note' ? 220 : 260
  const minHeight = targetNode.type === 'note' ? 110 : 140
  const mediaRatio = getMediaAspectRatio(targetNode)

  if ((isImageNode(targetNode) || isVideoNode(targetNode)) && mediaRatio > 0) {
    if (interactionState.value.resizeHandle === 'right') {
      targetNode.width = Math.max(minWidth, interactionState.value.nodeWidth + deltaX)
      targetNode.height = Math.max(minHeight, targetNode.width / mediaRatio)
      return
    }

    if (interactionState.value.resizeHandle === 'bottom') {
      targetNode.height = Math.max(minHeight, interactionState.value.nodeHeight + deltaY)
      targetNode.width = Math.max(minWidth, targetNode.height * mediaRatio)
      return
    }

    const widthByX = Math.max(minWidth, interactionState.value.nodeWidth + deltaX)
    const widthByY = Math.max(minWidth, (interactionState.value.nodeHeight + deltaY) * mediaRatio)
    const widthDelta = Math.abs(widthByX - interactionState.value.nodeWidth)
    const heightDelta = Math.abs(widthByY - interactionState.value.nodeWidth)
    const nextWidth = widthDelta >= heightDelta ? widthByX : widthByY
    targetNode.width = nextWidth
    targetNode.height = Math.max(minHeight, nextWidth / mediaRatio)
    return
  }

  if (interactionState.value.resizeHandle === 'right' || interactionState.value.resizeHandle === 'corner') {
    targetNode.width = Math.max(minWidth, interactionState.value.nodeWidth + deltaX)
  }

  if (interactionState.value.resizeHandle === 'bottom' || interactionState.value.resizeHandle === 'corner') {
    targetNode.height = Math.max(minHeight, interactionState.value.nodeHeight + deltaY)
  }
}

function onPointerUp() {
  if (interactionState.value.mode === 'marquee' && marqueeState.value.active) {
    const minX = Math.min(marqueeState.value.startWorldX, marqueeState.value.currentWorldX)
    const maxX = Math.max(marqueeState.value.startWorldX, marqueeState.value.currentWorldX)
    const minY = Math.min(marqueeState.value.startWorldY, marqueeState.value.currentWorldY)
    const maxY = Math.max(marqueeState.value.startWorldY, marqueeState.value.currentWorldY)
    const pick = nodes.value
      .filter((node) => {
        const nodeMinX = node.x
        const nodeMaxX = node.x + node.width
        const nodeMinY = node.y
        const nodeMaxY = node.y + node.height
        return !(nodeMaxX < minX || nodeMinX > maxX || nodeMaxY < minY || nodeMinY > maxY)
      })
      .map(node => node.id)
    selectedNodeIds.value = pick
    selectedNodeId.value = pick[0] || ''
  }
  marqueeState.value.active = false
  interactionState.value.mode = 'idle'
}

function onWheel(event: WheelEvent) {
  const host = canvasHostRef.value
  if (!host) return

  const isZoomGesture = isMacOS.value ? (event.metaKey || event.ctrlKey) : isWindowsOS.value ? event.ctrlKey : (event.metaKey || event.ctrlKey)
  if (!isZoomGesture && !isMacOS.value) {
    return
  }

  event.preventDefault()

  if (!isZoomGesture) {
    viewport.value.x -= event.deltaX
    viewport.value.y -= event.deltaY
    return
  }

  const rect = host.getBoundingClientRect()
  const localX = Math.min(Math.max(0, event.clientX - rect.left), rect.width)
  const localY = Math.min(Math.max(0, event.clientY - rect.top), rect.height)
  const prevZoom = viewport.value.zoom
  const zoomFactor = Math.exp(-event.deltaY * 0.0022)
  const nextZoom = Math.min(2.5, Math.max(0.3, Number((prevZoom * zoomFactor).toFixed(4))))
  const worldX = (localX - viewport.value.x) / prevZoom
  const worldY = (localY - viewport.value.y) / prevZoom

  viewport.value.zoom = nextZoom
  viewport.value.x = localX - worldX * nextZoom
  viewport.value.y = localY - worldY * nextZoom
}

function onGestureStart(event: Event) {
  if (!isMacOS.value) return
  const host = canvasHostRef.value
  if (!host) return
  const gestureEvent = event as Event & { clientX?: number; clientY?: number }
  event.preventDefault()
  const rect = host.getBoundingClientRect()
  const localX = Math.min(Math.max(0, (gestureEvent.clientX ?? rect.width / 2) - rect.left), rect.width)
  const localY = Math.min(Math.max(0, (gestureEvent.clientY ?? rect.height / 2) - rect.top), rect.height)
  gestureState.value = {
    active: true,
    startZoom: viewport.value.zoom,
    startViewportX: viewport.value.x,
    startViewportY: viewport.value.y,
    anchorLocalX: localX,
    anchorLocalY: localY,
  }
}

function onGestureChange(event: Event) {
  if (!isMacOS.value || !gestureState.value.active) return
  const gestureEvent = event as Event & { scale?: number }
  event.preventDefault()
  const scale = Number(gestureEvent.scale || 1)
  const amplifiedScale = 1 + (scale - 1) * 1.6
  const nextZoom = Math.min(2.5, Math.max(0.3, Number((gestureState.value.startZoom * amplifiedScale).toFixed(4))))
  const worldX = (gestureState.value.anchorLocalX - gestureState.value.startViewportX) / gestureState.value.startZoom
  const worldY = (gestureState.value.anchorLocalY - gestureState.value.startViewportY) / gestureState.value.startZoom
  viewport.value.zoom = nextZoom
  viewport.value.x = gestureState.value.anchorLocalX - worldX * nextZoom
  viewport.value.y = gestureState.value.anchorLocalY - worldY * nextZoom
}

function onGestureEnd() {
  gestureState.value.active = false
}

function adjustZoom(delta: number) {
  viewport.value.zoom = Math.min(2.5, Math.max(0.3, Number((viewport.value.zoom + delta).toFixed(3))))
}

function resetView() {
  viewport.value = { x: 40, y: 40, zoom: 1 }
}

function fitView() {
  const host = canvasHostRef.value
  if (!host || !nodes.value.length) {
    resetView()
    return
  }

  const padding = 80
  const minX = Math.min(...nodes.value.map(node => node.x))
  const minY = Math.min(...nodes.value.map(node => node.y))
  const maxX = Math.max(...nodes.value.map(node => node.x + node.width))
  const maxY = Math.max(...nodes.value.map(node => node.y + node.height))
  const contentWidth = Math.max(1, maxX - minX)
  const contentHeight = Math.max(1, maxY - minY)

  const availableWidth = Math.max(1, host.clientWidth - padding * 2)
  const availableHeight = Math.max(1, host.clientHeight - padding * 2)
  const nextZoom = Math.min(1.4, Math.max(0.35, Math.min(availableWidth / contentWidth, availableHeight / contentHeight)))

  viewport.value.zoom = nextZoom
  viewport.value.x = (host.clientWidth - contentWidth * nextZoom) / 2 - minX * nextZoom
  viewport.value.y = (host.clientHeight - contentHeight * nextZoom) / 2 - minY * nextZoom
}

function getNodeStyle(node: ProjectCanvasNode) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
  }
}

function getNodeAccentClass(node: ProjectCanvasNode) {
  if (isDarkMode.value) {
    if (node.type === 'note') return 'border-amber-700 bg-amber-900 text-amber-50'
    if (node.type === 'text') return 'border-sky-700 bg-sky-900 text-sky-50'
    if (node.type === 'ai_call') return 'border-violet-700 bg-violet-900 text-violet-50'
    return 'border-slate-700 bg-slate-900 text-slate-100'
  }

  if (node.type === 'note') return 'border-amber-300 bg-amber-50 text-amber-950'
  if (node.type === 'text') return 'border-sky-200 bg-sky-50 text-sky-950'
  if (node.type === 'ai_call') return 'border-violet-200 bg-violet-50 text-violet-950'
  return 'border-slate-200 bg-white text-slate-900'
}

function getResizeHandleClass(handle: ResizeHandle) {
  if (handle === 'right') return 'absolute right-0 top-1/2 h-10 w-2 -translate-y-1/2 cursor-ew-resize'
  if (handle === 'bottom') return 'absolute bottom-0 left-1/2 h-2 w-10 -translate-x-1/2 cursor-ns-resize'
  return 'absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize'
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

function handleKeydown(event: KeyboardEvent) {
  if (event.code === 'Space' && !isSpacePressed.value) {
    isSpacePressed.value = true
    event.preventDefault()
  }

  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if ((event.key === 'Backspace' || event.key === 'Delete') && (selectedNodeIds.value.length || selectedNode.value)) {
    event.preventDefault()
    if (selectedNodeIds.value.length > 1) {
      removeSelectedNodes()
    } else {
      removeSelectedNode()
    }
  }
  if (event.key === 'Escape') {
    editingTextNodeId.value = ''
    editingNoteNodeId.value = ''
    editingAiPromptNodeId.value = ''
    aiConfigNodeId.value = ''
    mediaMenuNodeId.value = ''
  }
}

function handleKeyup(event: KeyboardEvent) {
  if (event.code === 'Space') {
    isSpacePressed.value = false
  }
}

function detectPlatform() {
  const platform = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase()
  if (platform.includes('mac')) {
    platformType.value = 'mac'
    return
  }
  if (platform.includes('win')) {
    platformType.value = 'windows'
    return
  }
  platformType.value = 'other'
}

function getCanvasPositionFromClient(clientX: number, clientY: number): { x: number; y: number } {
  const host = canvasHostRef.value
  if (!host) {
    return { x: 80, y: 80 }
  }
  const rect = host.getBoundingClientRect()
  const localX = clientX - rect.left
  const localY = clientY - rect.top
  return {
    x: (localX - viewport.value.x) / viewport.value.zoom,
    y: (localY - viewport.value.y) / viewport.value.zoom,
  }
}

function openLocalUpload(nodeId: string, type: 'image' | 'video') {
  pendingUploadNodeId.value = nodeId
  if (type === 'image') {
    imageUploadInputRef.value?.click()
    return
  }
  videoUploadInputRef.value?.click()
}

function openResourceDialog(nodeId: string, type: 'image' | 'video') {
  resourceDialogNodeId.value = nodeId
  resourceDialogType.value = type
  resourceDialogOpen.value = true
}

function applyAssetToNode(nodeId: string, asset: ProjectAssetRef) {
  const node = getNodeById(nodeId)
  if (!node) return

  if (isImageNode(node) || isVideoNode(node)) {
    node.data.asset = {
      ...asset,
      provider: 'aliyun-oss',
    }
    normalizeMediaNodeSize(node, 'keep_width')
  }
}

function handleImageLoaded(node: ProjectCanvasNode, event: Event) {
  if (!isImageNode(node)) return
  const element = event.target as HTMLImageElement | null
  if (!element) return
  const width = element.naturalWidth || 0
  const height = element.naturalHeight || 0
  if (!width || !height) return
  node.data.asset.width = width
  node.data.asset.height = height
  normalizeMediaNodeSize(node, 'keep_width')
}

function handleVideoLoaded(node: ProjectCanvasNode, event: Event) {
  if (!isVideoNode(node)) return
  const element = event.target as HTMLVideoElement | null
  if (!element) return
  const width = element.videoWidth || 0
  const height = element.videoHeight || 0
  if (!width || !height) return
  node.data.asset.width = width
  node.data.asset.height = height
  normalizeMediaNodeSize(node, 'keep_width')
}

function pickAssetFromLibrary(item: ProjectAssetLibraryItem) {
  applyAssetToNode(resourceDialogNodeId.value, item.asset)
  resourceDialogOpen.value = false
}

function buildAssetPreviewKeys(asset: ProjectAssetRef): string[] {
  const keys = [asset.assetId, asset.objectKey, asset.url].filter((item): item is string => Boolean(item))
  return Array.from(new Set(keys))
}

function registerAssetPreview(asset: ProjectAssetRef, previewUrl: string) {
  if (!previewUrl) return
  const keys = buildAssetPreviewKeys(asset)
  for (const key of keys) {
    mediaPreviewIndex.value[key] = previewUrl
  }
}

function extractAssetUrl(asset: ProjectAssetRef): string {
  const keys = buildAssetPreviewKeys(asset)
  for (const key of keys) {
    const localPreview = mediaPreviewIndex.value[key]
    if (localPreview) {
      return localPreview
    }
  }
  const raw = asset.url || ''
  if (!raw) return ''
  if (/^oss:\/\//i.test(raw)) return ''
  return raw
}

function getNodeTypeLabel(node: ProjectCanvasNode): string {
  if (isScriptNode(node)) return '脚本'
  if (isTextNode(node)) return '文本'
  if (isImageNode(node)) return '图片'
  if (isVideoNode(node)) return '视频'
  if (isAiNode(node)) return 'AI'
  return '便签'
}

function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      const width = image.naturalWidth || 0
      const height = image.naturalHeight || 0
      URL.revokeObjectURL(objectUrl)
      resolve({ width, height })
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('无法读取图片尺寸'))
    }
    image.src = objectUrl
  })
}

function readVideoMeta(file: File): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const durationMs = Math.round((video.duration || 0) * 1000)
      const width = video.videoWidth || 0
      const height = video.videoHeight || 0
      URL.revokeObjectURL(objectUrl)
      resolve({ durationMs, width, height })
    }
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('无法读取视频元信息'))
    }
    video.src = objectUrl
  })
}

async function uploadMediaToNode(nodeId: string, type: 'image' | 'video', file: File) {
  const node = getNodeById(nodeId)
  if (!node) return

  const apiKey = currentApiKey.value
  if (!apiKey) {
    toast({
      title: '缺少 API Key',
      description: '请先在设置页配置百炼 API Key',
      variant: 'destructive',
    })
    return
  }

  uploading.value = true

  try {
    let asset: ProjectAssetRef
    const localPreviewUrl = URL.createObjectURL(file)

    if (type === 'image') {
      const uploaded = await uploadImageFile(file, DEFAULT_MODEL_ID, apiKey)
      const imageMeta = await readImageMeta(file)
      asset = {
        provider: 'aliyun-oss',
        url: uploaded.downloadLink,
        objectKey: uploaded.downloadLink.replace(/^oss:\/\//, ''),
        mimeType: file.type,
        sizeBytes: file.size,
        width: imageMeta.width,
        height: imageMeta.height,
      }
      if (isImageNode(node)) {
        node.data.title = file.name
      }
    } else {
      const validation = validateVideoFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error || '视频文件校验失败')
      }

      const videoMeta = await readVideoMeta(file)
      if (videoMeta.durationMs > 5 * 60 * 1000) {
        throw new Error('视频时长不能超过 5 分钟')
      }

      const uploaded = await uploadVideoFile(file, DEFAULT_MODEL_ID, apiKey)
      asset = {
        provider: 'aliyun-oss',
        url: uploaded.downloadLink,
        objectKey: uploaded.downloadLink.replace(/^oss:\/\//, ''),
        mimeType: file.type,
        sizeBytes: file.size,
        durationMs: videoMeta.durationMs,
        width: videoMeta.width,
        height: videoMeta.height,
      }
      if (isVideoNode(node)) {
        node.data.title = file.name
      }
    }

    registerAssetPreview(asset, localPreviewUrl)
    applyAssetToNode(nodeId, asset)

    const { bucket, objectKey } = parseOssLocation(asset.url || '')
    const savedAsset = await projectStore.upsertProjectAsset({
      projectId: projectId.value,
      assetType: type,
      sourceType: 'upload',
      provider: 'aliyun-oss',
      bucket,
      objectKey,
      ossUrl: asset.url || '',
      publicUrl: asset.url || '',
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: asset.width,
      height: asset.height,
      durationMs: asset.durationMs,
      metadata: {
        nodeId,
      },
    })

    const libraryItem = mapAssetRecordToLibraryItem(savedAsset)
    if (libraryItem) {
      const finalAsset = {
        ...asset,
        assetId: savedAsset.id,
      }
      registerAssetPreview(finalAsset, localPreviewUrl)
      applyAssetToNode(nodeId, finalAsset)
      const others = assetLibrary.value.filter(item => item.id !== libraryItem.id)
      assetLibrary.value = [libraryItem, ...others]
    }

    toast({
      title: '上传成功',
      description: `${type === 'image' ? '图片' : '视频'}已绑定到当前节点`,
    })
  } catch (error) {
    toast({
      title: '上传失败',
      description: parseUploadError(error),
      variant: 'destructive',
    })
  } finally {
    uploading.value = false
  }
}

async function onImageInputChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !pendingUploadNodeId.value) return
  await uploadMediaToNode(pendingUploadNodeId.value, 'image', file)
  ;(event.target as HTMLInputElement).value = ''
  pendingUploadNodeId.value = ''
}

async function onVideoInputChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !pendingUploadNodeId.value) return
  await uploadMediaToNode(pendingUploadNodeId.value, 'video', file)
  ;(event.target as HTMLInputElement).value = ''
  pendingUploadNodeId.value = ''
}

function onCanvasDragOver(event: DragEvent) {
  event.preventDefault()
  dragOver.value = true
}

function onCanvasDragLeave() {
  dragOver.value = false
}

async function onCanvasDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false

  const file = event.dataTransfer?.files?.[0]
  if (!file) return

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (!isImage && !isVideo) {
    toast({
      title: '不支持的文件类型',
      description: '仅支持拖入图片或视频文件',
      variant: 'destructive',
    })
    return
  }

  const position = getCanvasPositionFromClient(event.clientX, event.clientY)
  const nodeType: ProjectNodeType = isImage ? 'image' : 'video'
  addNode(nodeType, {
    x: position.x - 160,
    y: position.y - 110,
  })

  const node = nodes.value[nodes.value.length - 1]
  if (!node) return

  await uploadMediaToNode(node.id, isImage ? 'image' : 'video', file)
}

function openTextEdit(nodeId: string) {
  editingTextNodeId.value = nodeId
}

function openNoteEdit(nodeId: string) {
  editingNoteNodeId.value = nodeId
}

function openAiPromptEdit(nodeId: string) {
  editingAiPromptNodeId.value = nodeId
}

function finishInlineEdit() {
  editingTextNodeId.value = ''
  editingNoteNodeId.value = ''
  editingAiPromptNodeId.value = ''
}

function getAvailableModels(category: AiModelCategory) {
  return modelRegistry.listModelsByCategory(category)
}

function updateAiModelByCategory(node: ProjectAiCallNode) {
  const options = getAvailableModels(node.data.config.modelCategory)
  if (!options.length) {
    node.data.config.modelId = DEFAULT_MODEL_ID
    return
  }
  if (!options.find(item => item.id === node.data.config.modelId)) {
    node.data.config.modelId = options[0].id
  }
}

function getInputContextForAiNode(currentNodeId: string): string {
  const contexts: string[] = []

  for (const node of nodes.value) {
    if (node.id === currentNodeId) continue
    if (isTextNode(node)) {
      contexts.push(`文本(${node.id}): ${node.data.content || ''}`)
      continue
    }
    if (isScriptNode(node)) {
      contexts.push(`脚本(${node.id}): ${node.data.visualContent || ''} / 口播: ${node.data.voiceover || ''}`)
    }
  }

  return contexts.join('\n')
}

async function runAiNode(node: ProjectAiCallNode) {
  const apiKey = currentApiKey.value
  if (!apiKey) {
    toast({
      title: '缺少 API Key',
      description: '请先在设置页配置百炼 API Key',
      variant: 'destructive',
    })
    return
  }

  if (!node.data.config.promptTemplate.trim()) {
    toast({
      title: '提示词为空',
      description: '请先输入 AI 节点提示词模板',
      variant: 'destructive',
    })
    return
  }

  node.data.result.status = 'running'
  node.data.result.errorCode = undefined
  node.data.result.errorMessage = undefined

  try {
    const result = await runProjectAiCard({
      apiKey,
      modelId: node.data.config.modelId,
      outputType: node.data.config.outputType,
      promptTemplate: node.data.config.promptTemplate,
      inputContext: getInputContextForAiNode(node.id),
    })

    node.data.result = {
      status: 'success',
      outputType: node.data.config.outputType,
      content: result.content,
      usage: result.usage,
      finishedAt: new Date().toISOString(),
    }
  } catch (error) {
    node.data.result = {
      ...node.data.result,
      status: 'error',
      outputType: node.data.config.outputType,
      errorCode: 'RUN_FAILED',
      errorMessage: error instanceof Error ? error.message : '执行失败',
      finishedAt: new Date().toISOString(),
    }
  }
}

function formatResultContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (content == null) return ''
  try {
    return JSON.stringify(content, null, 2)
  } catch {
    return String(content)
  }
}

onMounted(async () => {
  detectPlatform()
  loadTheme()
  modelRegistry.loadRegistry()
  await Promise.all([
    loadProject(),
    loadAssetLibrary(),
  ])
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
})

onUnmounted(() => {
  const revoked = new Set<string>()
  for (const value of Object.values(mediaPreviewIndex.value)) {
    if (value.startsWith('blob:') && !revoked.has(value)) {
      revoked.add(value)
      URL.revokeObjectURL(value)
    }
  }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
})
</script>

<template>
  <div class="relative h-screen overflow-hidden" :class="canvasThemeClass">
    <input
      ref="imageUploadInputRef"
      class="hidden"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      @change="onImageInputChange"
    />
    <input
      ref="videoUploadInputRef"
      class="hidden"
      type="file"
      accept="video/mp4,video/quicktime,video/x-msvideo"
      @change="onVideoInputChange"
    />

    <main
      ref="canvasHostRef"
      class="absolute inset-0 overflow-hidden"
      @pointerdown="onBackgroundPointerDown"
      @wheel="onWheel"
      @gesturestart="onGestureStart"
      @gesturechange="onGestureChange"
      @gestureend="onGestureEnd"
      @contextmenu.prevent
      @dragover="onCanvasDragOver"
      @dragleave="onCanvasDragLeave"
      @drop="onCanvasDrop"
    >
      <div v-if="loading" class="flex h-full items-center justify-center text-sm opacity-70">
        正在加载项目画布...
      </div>

      <template v-else>
        <div
          class="pointer-events-none absolute inset-0"
          :class="isDarkMode ? 'opacity-18' : 'opacity-34'"
          :style="{
            backgroundImage: isDarkMode
              ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
              : 'linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)',
            backgroundSize: `${Math.max(16, 24 * viewport.zoom)}px ${Math.max(16, 24 * viewport.zoom)}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }"
        />

        <div
          v-if="dragOver"
          class="pointer-events-none absolute inset-0 z-10 border-2 border-dashed"
          :class="isDarkMode ? 'border-sky-300/60 bg-sky-400/10' : 'border-sky-500/45 bg-sky-100/50'"
        />
        <div
          v-if="marqueeState.active"
          class="pointer-events-none absolute z-10 border border-sky-400/80 bg-sky-300/15"
          :style="marqueeStyle"
        />

        <div class="absolute left-0 top-0 h-full w-full" :style="canvasStyle">
          <article
            v-for="node in nodes"
            :key="node.id"
            data-role="project-node"
            class="absolute cursor-move overflow-hidden rounded-2xl border shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
            :class="getNodeAccentClass(node)"
            :style="getNodeStyle(node)"
            @pointerdown="onNodePointerDown($event, node)"
          >
            <div class="pointer-events-none absolute left-2 right-2 top-2 z-10 flex items-center justify-between text-[11px]">
              <span
                class="rounded-md px-1.5 py-0.5 font-medium"
                :class="isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'"
              >
                {{ getNodeTypeLabel(node) }}
              </span>
              <span />
            </div>

            <template v-if="isScriptNode(node)">
              <div class="h-full p-4 pt-8">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold">脚本 #{{ String(node.data.sequenceNumber || '-') }}</div>
                  <Badge variant="secondary" class="text-[10px]">
                    {{ node.data.duration || '未标时长' }}
                  </Badge>
                </div>
                <div class="mt-2 text-xs opacity-70">
                  {{ node.data.shotType || '未标注景别' }} · {{ node.data.cameraMovement || '未标注运镜' }}
                </div>
                <div class="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6">
                  {{ node.data.visualContent || '无画面内容' }}
                </div>
                <div class="mt-3 line-clamp-3 text-xs leading-5 opacity-70">
                  口播：{{ node.data.voiceover || '无口播' }}
                </div>
              </div>
            </template>

            <template v-else-if="isTextNode(node)">
              <div class="h-full p-4 pt-8">
                <div class="mb-2 text-xs font-medium opacity-70">{{ node.data.title || '文本节点' }}</div>
                <textarea
                  v-if="editingTextNodeId === node.id"
                  v-model="node.data.content"
                  data-no-drag="true"
                  class="h-full w-full resize-none rounded-lg border border-transparent bg-transparent text-sm leading-6 outline-none"
                  @blur="finishInlineEdit"
                />
                <div
                  v-else
                  class="h-full whitespace-pre-wrap text-sm leading-6"
                  @dblclick.stop="openTextEdit(node.id)"
                >
                  {{ node.data.content || '双击编辑文本内容' }}
                </div>
              </div>
            </template>

            <template v-else-if="isImageNode(node)">
              <div class="relative h-full w-full">
                <img
                  v-if="extractAssetUrl(node.data.asset)"
                  :src="extractAssetUrl(node.data.asset)"
                  :alt="node.data.title || '图片节点'"
                  class="h-full w-full object-contain"
                  draggable="false"
                  @dragstart.prevent
                  @load="handleImageLoaded(node, $event)"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-sm opacity-65">
                  点击后选择上传图片
                </div>

                <div
                  v-if="mediaMenuNodeId === node.id"
                  data-no-drag="true"
                  class="absolute right-2 top-8 flex gap-2 rounded-lg border px-2 py-1 text-xs"
                  :class="isDarkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-300 bg-white'"
                >
                  <Button
                    data-no-drag="true"
                    size="sm"
                    variant="ghost"
                    class="h-7 px-2 text-xs"
                    @click.stop="openLocalUpload(node.id, 'image')"
                  >
                    <Upload class="mr-1 h-3.5 w-3.5" />
                    本地上传
                  </Button>
                  <Button
                    data-no-drag="true"
                    size="sm"
                    variant="ghost"
                    class="h-7 px-2 text-xs"
                    @click.stop="openResourceDialog(node.id, 'image')"
                  >
                    资源库
                  </Button>
                </div>
              </div>
            </template>

            <template v-else-if="isVideoNode(node)">
              <div class="relative h-full w-full">
                <video
                  v-if="extractAssetUrl(node.data.asset)"
                  :src="extractAssetUrl(node.data.asset)"
                  class="h-full w-full object-contain"
                  controls
                  preload="metadata"
                  @loadedmetadata="handleVideoLoaded(node, $event)"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-sm opacity-65">
                  点击后选择上传视频
                </div>

                <div
                  v-if="mediaMenuNodeId === node.id"
                  data-no-drag="true"
                  class="absolute right-2 top-8 flex gap-2 rounded-lg border px-2 py-1 text-xs"
                  :class="isDarkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-300 bg-white'"
                >
                  <Button
                    data-no-drag="true"
                    size="sm"
                    variant="ghost"
                    class="h-7 px-2 text-xs"
                    @click.stop="openLocalUpload(node.id, 'video')"
                  >
                    <Upload class="mr-1 h-3.5 w-3.5" />
                    本地上传
                  </Button>
                  <Button
                    data-no-drag="true"
                    size="sm"
                    variant="ghost"
                    class="h-7 px-2 text-xs"
                    @click.stop="openResourceDialog(node.id, 'video')"
                  >
                    资源库
                  </Button>
                </div>
              </div>
            </template>

            <template v-else-if="isAiNode(node)">
              <div class="flex h-full flex-col p-3 pt-8">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div class="text-sm font-semibold">{{ node.data.title || 'AI 节点' }}</div>
                  <div class="flex gap-1" data-no-drag="true">
                    <Button
                      data-no-drag="true"
                      size="sm"
                      variant="ghost"
                      class="h-7 px-2 text-xs"
                      @click.stop="aiConfigNodeId = aiConfigNodeId === node.id ? '' : node.id"
                    >
                      选项
                    </Button>
                    <Button
                      data-no-drag="true"
                      size="sm"
                      class="h-7 px-2 text-xs"
                      :disabled="node.data.result.status === 'running'"
                      @click.stop="runAiNode(node)"
                    >
                      {{ node.data.result.status === 'running' ? '运行中' : '运行' }}
                    </Button>
                  </div>
                </div>

                <div v-if="aiConfigNodeId === node.id" class="mb-2 grid grid-cols-2 gap-2" data-no-drag="true">
                  <label class="space-y-1 text-xs">
                    <span class="opacity-70">模型分类</span>
                    <select
                      v-model="node.data.config.modelCategory"
                      data-no-drag="true"
                      class="h-8 w-full rounded border border-white/15 bg-transparent px-2 outline-none"
                      @change="updateAiModelByCategory(node)"
                    >
                      <option v-for="item in aiCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                    </select>
                  </label>

                  <label class="space-y-1 text-xs">
                    <span class="opacity-70">输出类型</span>
                    <select
                      v-model="node.data.config.outputType"
                      data-no-drag="true"
                      class="h-8 w-full rounded border border-white/15 bg-transparent px-2 outline-none"
                    >
                      <option v-for="item in aiOutputTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                    </select>
                  </label>

                  <label class="col-span-2 space-y-1 text-xs">
                    <span class="opacity-70">模型</span>
                    <select
                      v-model="node.data.config.modelId"
                      data-no-drag="true"
                      class="h-8 w-full rounded border border-white/15 bg-transparent px-2 outline-none"
                    >
                      <option
                        v-for="model in getAvailableModels(node.data.config.modelCategory)"
                        :key="model.id"
                        :value="model.id"
                      >
                        {{ model.name }}
                      </option>
                    </select>
                  </label>
                </div>

                <div class="min-h-[72px] rounded-lg border border-white/10 p-2 text-xs" data-no-drag="true">
                  <textarea
                    v-if="editingAiPromptNodeId === node.id"
                    v-model="node.data.config.promptTemplate"
                    data-no-drag="true"
                    class="h-16 w-full resize-none bg-transparent outline-none"
                    @blur="finishInlineEdit"
                  />
                  <div
                    v-else
                    class="line-clamp-4 whitespace-pre-wrap leading-5"
                    @dblclick.stop="openAiPromptEdit(node.id)"
                  >
                    {{ node.data.config.promptTemplate || '双击输入提示词模板' }}
                  </div>
                </div>

                <div class="mt-2 flex-1 rounded-lg border border-white/10 p-2 text-xs" data-no-drag="true">
                  <div class="mb-1 flex items-center justify-between">
                    <span class="font-medium">运行结果</span>
                    <span class="opacity-70">{{ node.data.result.status }}</span>
                  </div>
                  <pre class="max-h-28 overflow-auto whitespace-pre-wrap break-words leading-5">{{ formatResultContent(node.data.result.status === 'error' ? node.data.result.errorMessage : node.data.result.content) || '暂无输出' }}</pre>
                </div>
              </div>
            </template>

            <template v-else-if="isNoteNode(node)">
              <div class="h-full p-4 pt-8">
                <textarea
                  v-if="editingNoteNodeId === node.id"
                  v-model="node.data.content"
                  data-no-drag="true"
                  class="h-full w-full resize-none rounded-lg border border-transparent bg-transparent text-sm leading-6 outline-none"
                  @blur="finishInlineEdit"
                />
                <p
                  v-else
                  class="h-full whitespace-pre-wrap text-sm leading-6"
                  @dblclick.stop="openNoteEdit(node.id)"
                >
                  {{ String(node.data.content || '双击编辑便签内容') }}
                </p>
              </div>
            </template>

            <span
              :class="getResizeHandleClass('right')"
              @pointerdown="onResizePointerDown($event, node, 'right')"
            />
            <span
              :class="getResizeHandleClass('bottom')"
              @pointerdown="onResizePointerDown($event, node, 'bottom')"
            />
            <span
              :class="getResizeHandleClass('corner')"
              @pointerdown="onResizePointerDown($event, node, 'corner')"
            />
          </article>
        </div>

        <div class="pointer-events-none absolute left-6 right-6 top-5 z-20 flex items-start justify-between">
          <div
            class="pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/50 text-white' : 'border-slate-200 bg-white/82 text-slate-900'"
          >
            <div class="flex items-center gap-3">
              <Button variant="secondary" size="sm" :class="isDarkMode ? 'border-0 bg-white/8 text-white hover:bg-white/12' : ''" @click="goToProjects">
                <ArrowLeft class="mr-1.5 h-4 w-4" />
                返回项目列表
              </Button>
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ projectTitle || '未命名项目' }}</div>
                <div class="truncate text-xs opacity-60">来源：{{ sourceType || 'manual' }}</div>
              </div>
            </div>
          </div>

          <div
            class="pointer-events-auto flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/50 text-white' : 'border-slate-200 bg-white/82 text-slate-900'"
          >
            <Button variant="ghost" size="sm" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="fitView">
              <Maximize class="mr-1.5 h-4 w-4" />
              适配内容
            </Button>
            <Button variant="ghost" size="sm" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="toggleTheme">
              <Sun v-if="isDarkMode" class="mr-1.5 h-4 w-4" />
              <Moon v-else class="mr-1.5 h-4 w-4" />
              {{ isDarkMode ? '浅色' : '暗黑' }}
            </Button>
            <Button variant="ghost" size="sm" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="resetView">
              重置视图
            </Button>
            <Button size="sm" :class="isDarkMode ? 'bg-white text-slate-950 hover:bg-white/90' : ''" :disabled="saving" @click="saveSnapshot">
              <Save class="mr-1.5 h-4 w-4" />
              {{ saving ? '保存中...' : '保存' }}
            </Button>
          </div>
        </div>

        <aside class="pointer-events-none absolute left-5 top-1/2 z-20 -translate-y-1/2">
          <div
            class="pointer-events-auto flex flex-col gap-2 rounded-2xl border p-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/50 text-white' : 'border-slate-200 bg-white/82 text-slate-900'"
          >
            <Button
              v-for="action in leftCreateActions"
              :key="action.type"
              variant="ghost"
              size="sm"
              class="justify-start"
              :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''"
              @click="addNode(action.type)"
            >
              <component :is="action.icon" class="mr-1.5 h-4 w-4" />
              {{ action.label }}
            </Button>
          </div>
        </aside>

        <div class="pointer-events-none absolute bottom-5 left-5 z-20">
          <div
            class="pointer-events-auto flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/50 text-white' : 'border-slate-200 bg-white/82 text-slate-900'"
          >
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="icon" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="adjustZoom(-0.1)">
                <ZoomOut class="h-4 w-4" />
              </Button>
              <Badge variant="secondary" class="min-w-14 justify-center" :class="isDarkMode ? 'border-0 bg-white/8 text-white' : ''">{{ zoomPercent }}</Badge>
              <Button variant="ghost" size="icon" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="adjustZoom(0.1)">
                <ZoomIn class="h-4 w-4" />
              </Button>
            </div>

            <div class="h-8 w-px" :class="isDarkMode ? 'bg-white/15' : 'bg-slate-300'" />

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-4">
              <div class="flex items-center gap-1.5">
                <span class="opacity-65">缩放</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">
                  {{ isMacOS ? 'Cmd' : 'Ctrl' }}
                </span>
                <span class="opacity-60">+</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">滚轮</span>
                <span v-if="isMacOS" class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">
                  捏合
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="opacity-65">移动</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">Space</span>
                <span class="opacity-60">+</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">左键</span>
                <span class="opacity-60">/</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">
                  {{ isMacOS ? '双指滚动' : isWindowsOS ? '中键拖拽' : '滚轮拖拽' }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="opacity-65">其他</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">Delete</span>
                <span class="opacity-60">删除</span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">
                  {{ isMacOS ? 'Cmd+Z' : 'Ctrl+Z' }}
                </span>
                <span class="rounded-md border px-1.5 py-0.5" :class="isDarkMode ? 'border-white/25 bg-white/5' : 'border-slate-300 bg-white'">
                  {{ isMacOS ? 'Cmd+Shift+Z' : 'Ctrl+Y' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Dialog v-model:open="resourceDialogOpen">
          <DialogContent class="max-w-3xl">
            <DialogHeader>
              <DialogTitle>资源库（{{ resourceDialogType === 'image' ? '图片' : '视频' }}）</DialogTitle>
            </DialogHeader>
            <div class="max-h-[65vh] overflow-auto">
              <div v-if="!filteredLibraryItems.length" class="py-10 text-center text-sm text-muted-foreground">
                暂无可用资源，请先上传。
              </div>
              <div v-else class="grid grid-cols-2 gap-3">
                <button
                  v-for="item in filteredLibraryItems"
                  :key="item.id"
                  class="rounded-lg border p-2 text-left transition hover:border-primary"
                  @click="pickAssetFromLibrary(item)"
                >
                  <img
                    v-if="item.type === 'image'"
                    :src="extractAssetUrl(item.asset)"
                    :alt="item.title"
                    class="h-28 w-full rounded object-cover"
                    draggable="false"
                    @dragstart.prevent
                  />
                  <video
                    v-else
                    :src="extractAssetUrl(item.asset)"
                    class="h-28 w-full rounded object-cover"
                    muted
                    playsinline
                  />
                  <div class="mt-2 truncate text-xs font-medium">{{ item.title }}</div>
                  <div class="mt-1 text-[11px] text-muted-foreground">{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</div>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </template>
    </main>

    <div
      v-if="uploading"
      class="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border px-4 py-2 text-xs"
      :class="isDarkMode ? 'border-white/15 bg-black/32 text-white' : 'border-slate-300 bg-white/82 text-slate-900'"
    >
      正在上传媒体...
    </div>
  </div>
</template>
