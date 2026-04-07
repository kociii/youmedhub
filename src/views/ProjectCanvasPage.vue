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
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import { useProjects } from '@/composables/useProjects'
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
const PROJECT_CANVAS_ASSET_LIBRARY_KEY = 'project_canvas_asset_library'

interface ProjectAssetLibraryItem {
  id: string
  type: 'image' | 'video'
  title: string
  createdAt: string
  asset: ProjectAssetRef
}

type InteractionMode = 'idle' | 'pan' | 'drag' | 'resize'
type ResizeHandle = 'right' | 'bottom' | 'corner'

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const dragOver = ref(false)
const projectTitle = ref('')
const sourceType = ref('')
const selectedNodeId = ref('')
const nodes = ref<ProjectCanvasNode[]>([])
const viewport = ref({ x: 40, y: 40, zoom: 1 })
const theme = ref<'light' | 'dark'>('dark')

const editingTextNodeId = ref('')
const editingNoteNodeId = ref('')
const editingAiPromptNodeId = ref('')
const aiConfigNodeId = ref('')
const mediaMenuNodeId = ref('')

const assetLibrary = ref<ProjectAssetLibraryItem[]>([])
const resourceDialogOpen = ref(false)
const resourceDialogNodeId = ref('')
const resourceDialogType = ref<'image' | 'video'>('image')

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

const projectId = computed(() => String(route.params.id || ''))
const zoomPercent = computed(() => `${Math.round(viewport.value.zoom * 100)}%`)
const selectedNode = computed(() => nodes.value.find(item => item.id === selectedNodeId.value) || null)
const isDarkMode = computed(() => theme.value === 'dark')
const canvasThemeClass = computed(() => {
  if (isDarkMode.value) {
    return 'bg-[#0b0d12] text-slate-100'
  }
  return 'bg-[#f7f8fb] text-slate-900'
})

const canvasStyle = computed(() => ({
  transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
  transformOrigin: '0 0',
}))

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

function normalizeLoadedNodes(rawNodes: ProjectCanvasNode[]): ProjectCanvasNode[] {
  return rawNodes.map(node => ({
    ...node,
    width: node.width || getDefaultNodeSize(node.type).width,
    height: node.height || getDefaultNodeSize(node.type).height,
  }))
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
  if (newNode.type === 'image' || newNode.type === 'video') {
    mediaMenuNodeId.value = newNode.id
  }
}

function removeSelectedNode() {
  if (!selectedNode.value) return
  nodes.value = nodes.value.filter(item => item.id !== selectedNode.value?.id)
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

function loadAssetLibrary() {
  try {
    const raw = localStorage.getItem(PROJECT_CANVAS_ASSET_LIBRARY_KEY)
    if (!raw) {
      assetLibrary.value = []
      return
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      assetLibrary.value = []
      return
    }
    assetLibrary.value = parsed.filter((item): item is ProjectAssetLibraryItem => {
      return Boolean(
        item &&
        typeof item.id === 'string' &&
        (item.type === 'image' || item.type === 'video') &&
        item.asset &&
        typeof item.asset.provider === 'string',
      )
    })
  } catch {
    assetLibrary.value = []
  }
}

function persistAssetLibrary() {
  localStorage.setItem(PROJECT_CANVAS_ASSET_LIBRARY_KEY, JSON.stringify(assetLibrary.value.slice(0, 500)))
}

function pushAssetToLibrary(type: 'image' | 'video', asset: ProjectAssetRef, title: string) {
  assetLibrary.value = [
    {
      id: `asset_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      type,
      title,
      createdAt: new Date().toISOString(),
      asset,
    },
    ...assetLibrary.value,
  ]
  persistAssetLibrary()
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
  if (event.button !== 0 && event.button !== 1) return
  if (event.button === 0 && (event.target as HTMLElement)?.closest('[data-role="project-node"]')) return
  if (event.button === 1) {
    event.preventDefault()
  }
  selectedNodeId.value = ''
  mediaMenuNodeId.value = ''
  aiConfigNodeId.value = ''
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
}

function onNodePointerDown(event: PointerEvent, node: ProjectCanvasNode) {
  if (event.button === 1) {
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

  if (interactionState.value.mode === 'drag') {
    targetNode.x = interactionState.value.nodeX + deltaX
    targetNode.y = interactionState.value.nodeY + deltaY
    return
  }

  const minWidth = targetNode.type === 'note' ? 220 : 260
  const minHeight = targetNode.type === 'note' ? 110 : 140

  if (interactionState.value.resizeHandle === 'right' || interactionState.value.resizeHandle === 'corner') {
    targetNode.width = Math.max(minWidth, interactionState.value.nodeWidth + deltaX)
  }

  if (interactionState.value.resizeHandle === 'bottom' || interactionState.value.resizeHandle === 'corner') {
    targetNode.height = Math.max(minHeight, interactionState.value.nodeHeight + deltaY)
  }
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
    if (node.type === 'note') return 'border-amber-400/55 bg-amber-950/50 text-amber-50'
    if (node.type === 'text') return 'border-sky-400/45 bg-sky-950/40 text-sky-50'
    if (node.type === 'ai_call') return 'border-violet-400/45 bg-violet-950/35 text-violet-50'
    return 'border-slate-300/15 bg-[#111827]/88 text-slate-100'
  }

  if (node.type === 'note') return 'border-amber-300/70 bg-amber-50/95 text-amber-950'
  if (node.type === 'text') return 'border-sky-200/70 bg-sky-50/95 text-sky-950'
  if (node.type === 'ai_call') return 'border-violet-200/80 bg-violet-50/95 text-violet-950'
  return 'border-slate-200/80 bg-white/96 text-slate-900'
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
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if ((event.key === 'Backspace' || event.key === 'Delete') && selectedNode.value) {
    event.preventDefault()
    removeSelectedNode()
  }
  if (event.key === 'Escape') {
    editingTextNodeId.value = ''
    editingNoteNodeId.value = ''
    editingAiPromptNodeId.value = ''
    aiConfigNodeId.value = ''
    mediaMenuNodeId.value = ''
  }
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
  }
}

function pickAssetFromLibrary(item: ProjectAssetLibraryItem) {
  applyAssetToNode(resourceDialogNodeId.value, item.asset)
  resourceDialogOpen.value = false
}

function extractAssetUrl(asset: ProjectAssetRef): string {
  return asset.url || ''
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

    applyAssetToNode(nodeId, asset)
    pushAssetToLibrary(type, asset, file.name)

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
  }, false)

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
  loadTheme()
  loadAssetLibrary()
  modelRegistry.loadRegistry()
  await loadProject()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', handleKeydown)
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
          :class="isDarkMode ? 'opacity-40' : 'opacity-55'"
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

        <div class="absolute left-0 top-0 h-full w-full will-change-transform" :style="canvasStyle">
          <article
            v-for="node in nodes"
            :key="node.id"
            data-role="project-node"
            class="absolute cursor-move overflow-hidden rounded-2xl border shadow-[0_20px_40px_rgba(0,0,0,0.12)] backdrop-blur"
            :class="[
              getNodeAccentClass(node),
              selectedNodeId === node.id ? (isDarkMode ? 'ring-2 ring-sky-300/50' : 'ring-2 ring-sky-500/60') : '',
            ]"
            :style="getNodeStyle(node)"
            @pointerdown="onNodePointerDown($event, node)"
          >
            <template v-if="isScriptNode(node)">
              <div class="h-full p-4">
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
              <div class="h-full p-4">
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
                />
                <div v-else class="flex h-full w-full items-center justify-center text-sm opacity-65">
                  点击后选择上传图片
                </div>

                <div
                  v-if="mediaMenuNodeId === node.id"
                  data-no-drag="true"
                  class="absolute right-2 top-2 flex gap-2 rounded-lg border px-2 py-1 text-xs"
                  :class="isDarkMode ? 'border-white/15 bg-black/45' : 'border-slate-300 bg-white/90'"
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
                />
                <div v-else class="flex h-full w-full items-center justify-center text-sm opacity-65">
                  点击后选择上传视频
                </div>

                <div
                  v-if="mediaMenuNodeId === node.id"
                  data-no-drag="true"
                  class="absolute right-2 top-2 flex gap-2 rounded-lg border px-2 py-1 text-xs"
                  :class="isDarkMode ? 'border-white/15 bg-black/45' : 'border-slate-300 bg-white/90'"
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
              <div class="flex h-full flex-col p-3">
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
              <div class="h-full p-4">
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
            class="pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/88 text-white' : 'border-slate-200 bg-white/90 text-slate-900'"
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
            class="pointer-events-auto flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/88 text-white' : 'border-slate-200 bg-white/90 text-slate-900'"
          >
            <Badge variant="secondary" :class="isDarkMode ? 'border-0 bg-white/8 text-white' : ''">{{ zoomPercent }}</Badge>
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
            class="pointer-events-auto flex flex-col gap-2 rounded-2xl border p-2 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/88 text-white' : 'border-slate-200 bg-white/90 text-slate-900'"
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

        <div class="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
          <div
            class="pointer-events-auto flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            :class="isDarkMode ? 'border-white/10 bg-[#12151d]/88 text-white' : 'border-slate-200 bg-white/90 text-slate-900'"
          >
            <Button variant="ghost" size="icon" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="adjustZoom(-0.1)">
              <ZoomOut class="h-4 w-4" />
            </Button>
            <Badge variant="secondary" class="min-w-14 justify-center" :class="isDarkMode ? 'border-0 bg-white/8 text-white' : ''">{{ zoomPercent }}</Badge>
            <Button variant="ghost" size="icon" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="adjustZoom(0.1)">
              <ZoomIn class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside
          v-if="selectedNode"
          class="absolute bottom-5 right-5 z-20 w-[340px] rounded-2xl border p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          :class="isDarkMode ? 'border-white/10 bg-[#12151d]/90 text-white' : 'border-slate-200 bg-white/95 text-slate-900'"
        >
          <div class="mb-3 flex items-center justify-between">
            <div>
              <div class="text-sm font-medium">节点属性</div>
              <div class="mt-1 text-[11px] opacity-45">{{ selectedNode.type }} · {{ selectedNode.id }}</div>
            </div>
            <Button variant="ghost" size="sm" :class="isDarkMode ? 'text-white hover:bg-white/10 hover:text-white' : ''" @click="removeSelectedNode">
              <Trash2 class="mr-1.5 h-4 w-4" />
              删除
            </Button>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="space-y-1">
              <span class="opacity-55">X</span>
              <input v-model.number="selectedNode.x" class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 outline-none" />
            </label>
            <label class="space-y-1">
              <span class="opacity-55">Y</span>
              <input v-model.number="selectedNode.y" class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 outline-none" />
            </label>
            <label class="space-y-1">
              <span class="opacity-55">宽</span>
              <input v-model.number="selectedNode.width" class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 outline-none" />
            </label>
            <label class="space-y-1">
              <span class="opacity-55">高</span>
              <input v-model.number="selectedNode.height" class="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 outline-none" />
            </label>
          </div>

          <template v-if="isScriptNode(selectedNode)">
            <label class="mt-3 block space-y-1 text-xs">
              <span class="opacity-55">画面内容</span>
              <textarea v-model="selectedNode.data.visualContent" class="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-2 outline-none" />
            </label>
            <label class="mt-3 block space-y-1 text-xs">
              <span class="opacity-55">口播</span>
              <textarea v-model="selectedNode.data.voiceover" class="h-20 w-full rounded-lg border border-white/10 bg-white/5 p-2 outline-none" />
            </label>
          </template>

          <template v-else-if="isTextNode(selectedNode)">
            <label class="mt-3 block space-y-1 text-xs">
              <span class="opacity-55">内容</span>
              <textarea v-model="selectedNode.data.content" class="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-2 outline-none" />
            </label>
          </template>

          <template v-else-if="isNoteNode(selectedNode)">
            <label class="mt-3 block space-y-1 text-xs">
              <span class="opacity-55">便签文本</span>
              <textarea v-model="selectedNode.data.content" class="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-2 outline-none" />
            </label>
          </template>
        </aside>

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
      :class="isDarkMode ? 'border-white/15 bg-black/65 text-white' : 'border-slate-300 bg-white/90 text-slate-900'"
    >
      正在上传媒体...
    </div>
  </div>
</template>
