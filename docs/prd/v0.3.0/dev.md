# v0.3.0 技术开发文档

> 基于 DOM 渲染 + Vue 插件注册表的无限画布实现

---

## 1. 架构变更概览

### 1.1 当前架构

```
┌─────────────────────────────────────────────────────────┐
│                   YouMedHub 当前架构                      │
├─────────────────────────────────────────────────────────┤
│  Vue 3 SPA                                              │
│  ├─ Vue Router (7 个页面)                                │
│  ├─ Composable 状态管理 (useVideoAnalysis, useAuth...)   │
│  ├─ shadcn-vue 组件库                                    │
│  └─ 阿里百炼 API (SSE 流式)                              │
│                                                         │
│  数据层: Supabase (Auth + 数据表)                        │
└─────────────────────────────────────────────────────────┘
```

### 1.2 目标架构

```
┌─────────────────────────────────────────────────────────┐
│                   YouMedHub v0.3.0                       │
├─────────────────────────────────────────────────────────┤
│  Vue 3 SPA                                              │
│  ├─ Vue Router (8 个页面，新增 /canvas)                   │
│  ├─ Composable 状态管理                                  │
│  │   ├─ useVideoAnalysis, useAuth... (现有)              │
│  │   └─ useCanvas, useCanvasViewport... (新增)           │
│  ├─ Canvas 模块 (新增)                                   │
│  │   ├─ 插件注册表 (PluginRegistry)                      │
│  │   ├─ 6 个内置节点插件                                  │
│  │   └─ 分层 DOM 渲染                                    │
│  ├─ shadcn-vue 组件库                                    │
│  └─ 阿里百炼 API (SSE 流式 + 图片/视频生成)              │
│                                                         │
│  数据层: Supabase (Auth + 数据表 + canvas_projects)      │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 目录结构

```
src/
├── canvas/                          # 画布模块（新增）
│   ├── plugins/                     # 插件系统
│   │   ├── types.ts                 # 插件接口定义 (CanvasNodePlugin, PluginMeta)
│   │   ├── registry.ts              # 插件注册表 (PluginRegistry 单例)
│   │   ├── builtins/                # 内置节点插件
│   │   │   ├── script/              # 分镜卡片插件
│   │   │   │   ├── ScriptRenderer.vue
│   │   │   │   ├── ScriptEditor.vue
│   │   │   │   └── index.ts
│   │   │   ├── text/                # 文本插件
│   │   │   │   ├── TextRenderer.vue
│   │   │   │   └── index.ts
│   │   │   ├── markdown/            # Markdown 插件
│   │   │   │   ├── MarkdownRenderer.vue
│   │   │   │   ├── MarkdownEditor.vue
│   │   │   │   └── index.ts
│   │   │   ├── image/               # 图片插件
│   │   │   │   ├── ImageRenderer.vue
│   │   │   │   └── index.ts
│   │   │   ├── video/               # 视频插件
│   │   │   │   ├── VideoRenderer.vue
│   │   │   │   └── index.ts
│   │   │   └── note/                # 便签插件
│   │   │       ├── NoteRenderer.vue
│   │   │       └── index.ts
│   │   └── register.ts              # 注册所有内置插件
│   ├── composables/                 # 画布状态管理
│   │   ├── useCanvas.ts             # 画布核心状态（节点、连线、视口）
│   │   ├── useCanvasViewport.ts     # 视口控制（平移、缩放、动画）
│   │   ├── useCanvasSelection.ts    # 选择状态管理（单选、多选、框选）
│   │   ├── useCanvasDrag.ts         # 节点拖拽逻辑
│   │   ├── useCanvasConnection.ts   # 连线拖拽逻辑
│   │   ├── useCanvasHistory.ts      # 撤销/重做（逆操作命令模式）
│   │   ├── useCanvasPersistence.ts  # 数据持久化（localStorage + Supabase）
│   │   └── useCanvasLayout.ts       # 自动布局算法
│   ├── components/                  # 画布 UI 组件
│   │   ├── CanvasContainer.vue      # 画布容器（视口 + 事件监听）
│   │   ├── CanvasGrid.vue           # 网格背景（CSS background）
│   │   ├── CanvasNode.vue           # 节点通用外壳（选中态、拖拽、缩放手柄）
│   │   ├── CanvasEdge.vue           # 单条连线渲染（SVG path）
│   │   ├── CanvasEdgeLayer.vue      # 连线层（SVG 容器）
│   │   ├── CanvasNodeLayer.vue      # 节点层（DOM 容器）
│   │   ├── SelectionBox.vue         # 框选矩形
│   │   ├── ContextMenu.vue          # 右键菜单
│   │   ├── MiniMap.vue              # 小地图（Phase 4，可选）
│   │   └── Toolbar.vue              # 底部工具栏
│   ├── types.ts                     # 画布类型定义
│   ├── constants.ts                 # 常量配置
│   └── utils/                       # 工具函数
│       ├── geometry.ts              # 几何计算（碰撞检测、锚点计算）
│       ├── export.ts                # 导出功能
│       └── transform.ts             # 坐标变换
├── views/
│   └── CanvasPage.vue               # 画布页面（新增）
```

---

## 3. 核心类型定义

```typescript
// src/canvas/types.ts

import type { Component } from 'vue'

// ==================== 节点 ====================

/** 画布节点 */
export interface CanvasNode {
  id: string
  type: string                   // 对应插件 kind
  x: number
  y: number
  width: number
  height: number
  rotation: number               // 旋转角度（预留，Phase 2）
  zIndex: number
  content: CanvasNodeContent
  style: CanvasNodeStyle
  locked: boolean                // 是否锁定位置
  collapsed: boolean             // 是否折叠
  createdAt: string
  updatedAt: string
}

/** 节点内容 */
export interface CanvasNodeContent {
  kind: string                   // 对应插件 kind
  data: string                   // JSON 序列化的内容数据
}

/** 节点样式 */
export interface CanvasNodeStyle {
  fill: string                   // 背景色
  stroke: string                 // 边框色
  strokeWidth: number
  borderRadius: number
  opacity: number
  shadow: boolean
}

// ==================== 连线 ====================

/** 画布连线 */
export interface CanvasEdge {
  id: string
  sourceId: string               // 起始节点 ID
  targetId: string               // 目标节点 ID
  sourceAnchor: AnchorPosition
  targetAnchor: AnchorPosition
  type: EdgeType
  style: EdgeStyle
  label?: string
  labelPosition: number          // 0-1，标签在线段上的位置
  zIndex: number
}

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left' | 'center'
export type EdgeType = 'straight' | 'bezier' | 'step'

export interface EdgeStyle {
  color: string
  strokeWidth: number
  dashArray: number[]
  startArrow: ArrowType
  endArrow: ArrowType
}

export type ArrowType = 'none' | 'arrow' | 'diamond' | 'circle'

// ==================== 视口 ====================

/** 视口状态 */
export interface ViewportState {
  offsetX: number                // 平移偏移 X（屏幕像素）
  offsetY: number                // 平移偏移 Y
  zoom: number                   // 缩放比例 0.1 ~ 3.0
}

/** 视口边界（画布坐标系） */
export interface ViewportBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// ==================== 持久化 ====================

/** 画布项目（持久化） */
export interface CanvasProject {
  id: string
  userId: string
  title: string
  description?: string
  thumbnail?: string             // 缩略图 URL
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: ViewportState
  createdAt: string
  updatedAt: string
}

// ==================== 历史系统 ====================

/** 历史操作类型 */
export type HistoryActionType =
  | 'addNode' | 'removeNode' | 'updateNode' | 'moveNode'
  | 'addEdge' | 'removeEdge' | 'updateEdge'
  | 'batch'

/** 历史操作记录 */
export interface HistoryAction {
  type: HistoryActionType
  payload: any
  inverse: () => HistoryAction   // 生成反向操作
}
```

---

## 4. 核心状态管理

### 4.1 useCanvas — 画布核心状态

采用与 `useVideoAnalysis` 一致的**模块级 ref + computed 单例**模式。

```typescript
// src/canvas/composables/useCanvas.ts

import { ref, computed } from 'vue'
import type { CanvasNode, CanvasEdge, ViewportState, CanvasProject } from '../types'

// ==================== 模块级状态 ====================

const nodes = ref<CanvasNode[]>([])
const edges = ref<CanvasEdge[]>([])
const viewport = ref<ViewportState>({ offsetX: 0, offsetY: 0, zoom: 1 })
const selectedNodeIds = ref<Set<string>>(new Set())
const selectedEdgeIds = ref<Set<string>>(new Set())
const projectId = ref<string | null>(null)

// ==================== 计算属性 ====================

const sortedNodes = computed(() =>
  [...nodes.value].sort((a, b) => a.zIndex - b.zIndex)
)

const selectedNodes = computed(() =>
  nodes.value.filter(n => selectedNodeIds.value.has(n.id))
)

// ==================== 节点 CRUD ====================

function addNode(node: CanvasNode): void {
  nodes.value.push(node)
}

function updateNode(id: string, partial: Partial<CanvasNode>): void {
  const idx = nodes.value.findIndex(n => n.id === id)
  if (idx !== -1) {
    nodes.value[idx] = { ...nodes.value[idx], ...partial, updatedAt: new Date().toISOString() }
  }
}

/**
 * 高频位置更新（拖拽时使用）
 * 参考 Constella 的 updateNodePosition 设计，避免触发完整对象 diff
 */
function updateNodePosition(id: string, x: number, y: number): void {
  const node = nodes.value.find(n => n.id === id)
  if (node) {
    node.x = x
    node.y = y
  }
}

function removeNode(id: string): void {
  nodes.value = nodes.value.filter(n => n.id !== id)
  removeEdgesByNode(id)  // 级联删除连线
}

function removeNodes(ids: string[]): void {
  const idSet = new Set(ids)
  nodes.value = nodes.value.filter(n => !idSet.has(n.id))
  edges.value = edges.value.filter(e => !idSet.has(e.sourceId) && !idSet.has(e.targetId))
}

function getNode(id: string): CanvasNode | undefined {
  return nodes.value.find(n => n.id === id)
}

// ==================== 连线 CRUD ====================

function addEdge(edge: CanvasEdge): void {
  edges.value.push(edge)
}

function updateEdge(id: string, partial: Partial<CanvasEdge>): void {
  const idx = edges.value.findIndex(e => e.id === id)
  if (idx !== -1) {
    edges.value[idx] = { ...edges.value[idx], ...partial }
  }
}

function removeEdge(id: string): void {
  edges.value = edges.value.filter(e => e.id !== id)
}

/** 节点删除时级联清理连线（参考 Constella 的 deleteEdgesByNode） */
function removeEdgesByNode(nodeId: string): void {
  edges.value = edges.value.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId)
}

function getEdgesByNode(nodeId: string): CanvasEdge[] {
  return edges.value.filter(e => e.sourceId === nodeId || e.targetId === nodeId)
}

// ==================== z-index 管理 ====================

function bringToFront(id: string): void {
  const maxZ = Math.max(...nodes.value.map(n => n.zIndex), 0)
  updateNode(id, { zIndex: maxZ + 1 })
}

function sendToBack(id: string): void {
  const minZ = Math.min(...nodes.value.map(n => n.zIndex), 0)
  updateNode(id, { zIndex: minZ - 1 })
}

// ==================== 脚本导入 ====================

/** 将 VideoScriptItem[] 转换为画布节点 */
function importFromScriptItems(items: VideoScriptItem[]): void {
  // 使用 useCanvasLayout 的流式布局
  const layoutNodes = layoutFlow(items)
  layoutNodes.forEach(n => addNode(n))
}

// ==================== 序列化 ====================

function serialize(): CanvasProject {
  return {
    id: projectId.value || crypto.randomUUID(),
    userId: '',  // 由 useCanvasPersistence 填充
    title: '未命名画布',
    nodes: nodes.value,
    edges: edges.value,
    viewport: viewport.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function deserialize(data: CanvasProject): void {
  nodes.value = data.nodes
  edges.value = data.edges
  viewport.value = data.viewport
  projectId.value = data.id
}

function clearCanvas(): void {
  nodes.value = []
  edges.value = []
  selectedNodeIds.value.clear()
  selectedEdgeIds.value.clear()
}

// ==================== 导出 ====================

export function useCanvas() {
  return {
    // 状态
    nodes, edges, viewport,
    selectedNodeIds, selectedEdgeIds,
    projectId,
    sortedNodes, selectedNodes,

    // 节点
    addNode, updateNode, updateNodePosition,
    removeNode, removeNodes, getNode,
    bringToFront, sendToBack,

    // 连线
    addEdge, updateEdge, removeEdge,
    removeEdgesByNode, getEdgesByNode,

    // 导入导出
    importFromScriptItems,
    serialize, deserialize, clearCanvas,
  }
}
```

### 4.2 useCanvasViewport — 视口控制

参考 infinite-canvas-tutorial 的 Camera API 设计，但使用 CSS transform 实现（DOM 方案）。

```typescript
// src/canvas/composables/useCanvasViewport.ts

import { computed, toRefs } from 'vue'
import type { ViewportState, ViewportBounds } from '../types'

const { viewport } = useCanvas()
const { offsetX, offsetY, zoom } = toRefs(viewport)

// CSS transform（GPU 加速）
const viewportTransform = computed(() =>
  `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoom.value})`
)

// ==================== 坐标转换 ====================

/** 屏幕坐标 → 画布坐标（参考 infinite-canvas-tutorial 的 viewport2Canvas） */
function screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: (screenX - offsetX.value) / zoom.value,
    y: (screenY - offsetY.value) / zoom.value,
  }
}

/** 画布坐标 → 屏幕坐标（参考 infinite-canvas-tutorial 的 canvas2Viewport） */
function canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
  return {
    x: canvasX * zoom.value + offsetX.value,
    y: canvasY * zoom.value + offsetY.value,
  }
}

/** 获取当前视口在画布坐标中的边界（参考 infinite-canvas-tutorial 的 getViewportBounds） */
function getViewportBounds(containerWidth: number, containerHeight: number): ViewportBounds {
  const topLeft = screenToCanvas(0, 0)
  const bottomRight = screenToCanvas(containerWidth, containerHeight)
  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
  }
}

// ==================== 视口操作 ====================

const MIN_ZOOM = 0.1
const MAX_ZOOM = 3.0

/** 平移画布 */
function panBy(dx: number, dy: number): void {
  offsetX.value += dx
  offsetY.value += dy
}

/** 缩放到指定位置（参考 infinite-canvas-tutorial 的 zoomTo + fixed viewport） */
function zoomTo(newZoom: number, centerX?: number, centerY?: number): void {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
  if (centerX !== undefined && centerY !== undefined) {
    // 以指定点为中心缩放：补偿位移
    offsetX.value = centerX - (centerX - offsetX.value) * (clampedZoom / zoom.value)
    offsetY.value = centerY - (centerY - offsetY.value) * (clampedZoom / zoom.value)
  }
  zoom.value = clampedZoom
}

/** 鼠标滚轮缩放 */
function zoomBy(delta: number, centerX: number, centerY: number): void {
  const factor = delta > 0 ? 0.9 : 1.1
  zoomTo(zoom.value * factor, centerX, centerY)
}

// ==================== 快捷视图 ====================

/** 重置视图（参考 infinite-canvas-tutorial 的 Ctrl+0） */
function resetView(): void {
  offsetX.value = 0
  offsetY.value = 0
  zoom.value = 1
}

/** 适配全部节点（参考 infinite-canvas-tutorial 的 fitToScreen） */
function fitAll(containerWidth: number, containerHeight: number, padding = 60): void {
  if (nodes.value.length === 0) { resetView(); return }
  const minX = Math.min(...nodes.value.map(n => n.x))
  const minY = Math.min(...nodes.value.map(n => n.y))
  const maxX = Math.max(...nodes.value.map(n => n.x + n.width))
  const maxY = Math.max(...nodes.value.map(n => n.y + n.height))

  const contentW = maxX - minX
  const contentH = maxY - minY
  const scaleX = (containerWidth - padding * 2) / contentW
  const scaleY = (containerHeight - padding * 2) / contentH
  const newZoom = Math.min(scaleX, scaleY, MAX_ZOOM)

  zoom.value = newZoom
  offsetX.value = (containerWidth - contentW * newZoom) / 2 - minX * newZoom
  offsetY.value = (containerHeight - contentH * newZoom) / 2 - minY * newZoom
}

/** 适配选中节点（参考 infinite-canvas-tutorial 的 fitToScreen 局部版） */
function fitSelection(containerWidth: number, containerHeight: number): void {
  // 同 fitAll，但仅计算 selectedNodes
}
```

### 4.3 useCanvasHistory — 撤销/重做

参考 infinite-canvas-tutorial Lesson 19 的逆操作命令模式。

```typescript
// src/canvas/composables/useCanvasHistory.ts

import { ref, computed } from 'vue'
import type { HistoryAction } from '../types'

const MAX_HISTORY = 50
const undoStack = ref<HistoryAction[]>([])
const redoStack = ref<HistoryAction[]>([])

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

function pushAction(action: HistoryAction): void {
  undoStack.value.push(action)
  if (undoStack.value.length > MAX_HISTORY) {
    undoStack.value.shift()
  }
  // 新操作清空 redo 栈（参考 infinite-canvas-tutorial: this.#redoStack.length = 0）
  redoStack.value = []
}

function undo(): void {
  const action = undoStack.value.pop()
  if (action) {
    const inverseAction = action.inverse()
    inverseAction.execute()  // 执行逆操作
    redoStack.value.push(action)
  }
}

function redo(): void {
  const action = redoStack.value.pop()
  if (action) {
    action.execute()         // 重做原操作
    undoStack.value.push(action.inverse())  // 压入逆操作
  }
}

function clearHistory(): void {
  undoStack.value = []
  redoStack.value = []
}
```

### 4.4 useCanvasDrag — 节点拖拽

```typescript
// src/canvas/composables/useCanvasDrag.ts

/**
 * 拖拽逻辑要点：
 * 1. pointerdown 选中节点 → 记录起始位置
 * 2. pointermove 调用 updateNodePosition（高频更新，参考 Constella）
 * 3. pointerup 结束拖拽 → 记录 HistoryAction（包含逆操作：从新位置回到旧位置）
 */
```

### 4.5 useCanvasPersistence — 数据持久化

```typescript
// src/canvas/composables/useCanvasPersistence.ts

const STORAGE_KEY = 'youmedhub-canvas'
const DEBOUNCE_MS = 500

/** 本地自动保存（debounce） */
function autoSaveToLocal(): void {
  // watch(nodes/edges/viewport, debounce(500ms) => localStorage.setItem)
}

/** 从本地恢复 */
function loadFromLocal(): CanvasProject | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

/** 保存到 Supabase */
async function saveToSupabase(project: CanvasProject): Promise<void> {
  // upsert to canvas_projects table
}

/** 从 Supabase 加载 */
async function loadFromSupabase(projectId: string): Promise<CanvasProject | null> {
  // select from canvas_projects where id = projectId
}
```

---

## 5. 渲染架构

采用 **分层 DOM 结构**（DOM 方案核心优势）：

```html
<!-- CanvasContainer.vue 简化结构 -->
<div class="canvas-viewport"
     @wheel.prevent="onWheel"
     @pointerdown="onPointerDown"
     @pointermove="onPointerMove"
     @pointerup="onPointerUp">

  <!-- 网格背景层（CSS background，不随节点移动） -->
  <CanvasGrid :zoom="zoom" :offset-x="offsetX" :offset-y="offsetY" />

  <!-- 连线层（SVG，与节点层共享 transform） -->
  <svg class="canvas-edge-layer" :style="{ transform: viewportTransform }">
    <CanvasEdge v-for="edge in edges" :key="edge.id" :edge="edge" :nodes="nodes" />
  </svg>

  <!-- 节点层（DOM，CSS transform GPU 加速） -->
  <div class="canvas-node-layer" :style="{ transform: viewportTransform }">
    <CanvasNode
      v-for="node in sortedNodes"
      :key="node.id"
      :node="node"
      :selected="selectedNodeIds.has(node.id)"
    >
      <!-- 动态渲染插件组件 -->
      <component :is="pluginRegistry.getRenderer(node.type)" :content="node.content" />
    </CanvasNode>
  </div>

  <!-- 框选层（不受视口变换影响） -->
  <SelectionBox v-if="isSelecting" :rect="selectionRect" />

  <!-- UI 覆盖层（固定定位，不受视口变换影响） -->
  <Toolbar :zoom="zoom" @zoom-in @zoom-out @reset-view @fit-all />
  <ContextMenu v-if="contextMenu.visible" :items="contextMenu.items" />
</div>
```

### 渲染优化策略

参考 infinite-canvas-tutorial 的性能优化思路，适配 DOM 方案：

| 策略 | infinite-canvas-tutorial 方案 | 本项目 DOM 适配 |
|------|------------------------------|----------------|
| 视口剔除 | RBush 空间索引 + AABB 碰撞 | `getViewportBounds()` + AABB 检测，视口外节点 `visibility: hidden` |
| 合批渲染 | Instanced GPU 渲染 | DOM 方案无需，浏览器自动优化 |
| 脏标记 | transform → bounds → render 级联 | Vue 响应式自动处理，`updateNodePosition` 避免完整 diff |
| 虚拟化 | 不需要（GPU 渲染） | 节点 > 100 时启用 `v-if` 虚拟化（只渲染视口内节点） |
| 连线同步 | 与节点层共享投影矩阵 | 连线层和节点层共享同一 `viewportTransform` |

### 视口剔除实现

参考 infinite-canvas-tutorial Lesson 8 的 beginFrame 钩子策略：

```typescript
// useCanvasViewport.ts 中的视口剔除
function applyViewportCulling(containerWidth: number, containerHeight: number): void {
  const bounds = getViewportBounds(containerWidth, containerHeight)
  nodes.value.forEach(node => {
    // AABB 碰撞检测（参考 infinite-canvas-tutorial 的 culling 逻辑）
    const isVisible =
      node.x + node.width >= bounds.minX &&
      node.y + node.height >= bounds.minY &&
      node.x <= bounds.maxX &&
      node.y <= bounds.maxY
    // 不移除节点，仅标记可见性（避免 Vue 重新挂载）
    node._visible = isVisible
  })
}
```

---

## 6. 数据模型

### 6.1 Supabase 表结构

```sql
-- 画布项目表
CREATE TABLE canvas_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '未命名画布',
  description TEXT,
  thumbnail TEXT,                    -- 画布缩略图 URL
  canvas_data JSONB NOT NULL,        -- { nodes, edges, viewport }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 画布快照表（Phase 4+，支持版本历史）
CREATE TABLE canvas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES canvas_projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_data JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE canvas_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON canvas_projects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON canvas_projects FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON canvas_projects FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON canvas_projects FOR DELETE USING (auth.uid() = user_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canvas_projects_updated_at
  BEFORE UPDATE ON canvas_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 6.2 节点内容数据格式

每种插件类型的 `content.data` 结构：

```typescript
// script 节点
interface ScriptContent {
  sequence: number           // 分镜序号
  shotSize: string           // 景别
  cameraMovement: string     // 运镜
  visualDescription: string  // 画面内容
  narration: string          // 口播文案
  duration: string           // 时长
  imageUrl?: string          // 分镜图 URL
  videoUrl?: string          // 视频片段 URL
}

// text 节点
interface TextContent {
  text: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
}

// markdown 节点
interface MarkdownContent {
  markdown: string
}

// image 节点
interface ImageContent {
  url: string
  alt?: string
  caption?: string
}

// video 节点
interface VideoContent {
  url: string
  posterUrl?: string
  duration?: number
}

// note 节点
interface NoteContent {
  text: string
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
}
```

---

## 7. 路由变更

```typescript
// router/index.ts 新增路由
{
  path: '/canvas',
  name: 'canvas',
  component: () => import('@/views/CanvasPage.vue'),
  meta: { title: '画布' }
}
```

---

## 8. 依赖评估

### 新增依赖

| 依赖 | 用途 | 体积（gzip） | 必要性 | 阶段 |
|------|------|-------------|--------|------|
| 无 | DOM 方案无需新增渲染依赖 | - | - | Phase 1 |

**可选依赖（Phase 2+）：**

| 依赖 | 用途 | 体积（gzip） | 必要性 | 阶段 |
|------|------|-------------|--------|------|
| `html-to-image` | 导出画布为 PNG | ~12KB | 可选 | Phase 4 |

### 不引入的依赖

| 依赖 | 原因 |
|------|------|
| `@infinite-canvas-tutorial/ecs` | ECS 架构过重，DOM 方案不需要 |
| `@antv/g-device-api` | GPU 渲染层，DOM 方案不需要 |
| `konva` / `fabric` | Canvas2D 库，与 DOM 方案冲突 |
| `yjs` | CRDT 协同为 Phase 4+ 考虑 |
| `@lastolivegames/becsy` | ECS 框架，不适用于 DOM 方案 |

---

## 9. 数据流图

```
┌──────────────┐     scriptItems     ┌──────────────────────┐
│ AnalyzePage  │ ──────────────────▶ │     CanvasPage        │
│ CreatePage   │   (路由参数/状态)    │                      │
└──────────────┘                     │  useCanvas            │
                                     │  ├─ nodes[]           │
                                     │  ├─ edges[]           │
                                     │  └─ viewport          │
                                     │                      │
                                     │  useCanvasViewport    │
                                     │  ├─ viewportTransform │
                                     │  ├─ screenToCanvas()  │
                                     │  └─ getViewportBounds │
                                     │                      │
                                     │  PluginRegistry       │
                                     │  ├─ script → ScriptRenderer.vue
                                     │  ├─ text   → TextRenderer.vue
                                     │  ├─ image  → ImageRenderer.vue
                                     │  ├─ video  → VideoRenderer.vue
                                     │  └─ ...               │
                                     │                      │
                                     │  useCanvasHistory     │
                                     │  ├─ undoStack         │
                                     │  └─ redoStack         │
                                     └──────────────────────┘
                                            │
                              ┌─────────────┼──────────────┐
                              │             │              │
                       ┌──────┴──────┐ ┌────┴────┐ ┌──────┴──────┐
                       │ Persistence │ │ AI Gen  │ │   Export    │
                       │ ├─ localStorage (自动) │ │ ├─ PNG       │
                       │ └─ Supabase (手动)    │ │ ├─ JSON      │
                       └─────────────┘ │ └─ DashScope API     │
                                       └─────────┘ └─────────────┘
```

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| DOM 渲染在大量节点时卡顿 | 50+ 节点后可能出现 | 视口剔除（`visibility: hidden`）、100+ 节点虚拟化 |
| 连线 SVG 与节点层同步问题 | 平移/缩放时连线偏移 | 共享同一 `viewportTransform` 状态，统一更新 |
| 脚本导入自动布局效果不佳 | 节点重叠或间距不合理 | 提供多种布局算法，支持手动调整 |
| 撤销/重做内存占用 | 长时间编辑后内存增长 | 限制最大历史 50 条，逆操作替代全量快照 |
| 分镜图生成与画布节点状态同步 | 生成中节点状态不一致 | 统一通过 useCanvas 更新，不绕过状态层 |
| 拖拽高频更新性能 | pointermove 每帧触发 | `updateNodePosition` 只更新 x/y，不触发完整 diff |

---

## 11. 测试策略

### 单元测试（Vitest）

- `PluginRegistry`：注册/获取/注销插件
- `useCanvas`：节点/连线 CRUD、序列化/反序列化
- `useCanvasViewport`：坐标转换、缩放计算、视口边界
- `useCanvasHistory`：撤销/重做、批量操作
- `geometry.ts`：碰撞检测、锚点计算

### 集成测试

- 脚本导入 → 节点生成 → 自动布局 → 手动调整
- 节点拖拽 → 连线跟随 → 撤销恢复
- AI 生成 → 节点内容更新 → 持久化

### 手动验证清单

- [ ] 画布平移/缩放流畅度（60fps 目标）
- [ ] 50 个节点下拖拽性能
- [ ] 连线在极端缩放下的渲染质量
- [ ] 浏览器兼容性（Chrome / Firefox / Safari）
