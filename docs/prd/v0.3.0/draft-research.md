# v0.3.0 - 无限画布编辑器

## 概述

为 YouMedHub 引入无限画布（Infinite Canvas）功能，让用户在 AI 生成脚本后，能在一个自由布局的画布上以节点形式组织脚本、文本、图片、视频等素材，并基于画布节点直接触发生成图片/视频的 AI 能力。

### 核心价值

- **自由组织**：打破线性脚本列表的局限，用户可以以非线性的方式自由组织内容结构
- **可视化创作**：将分镜脚本的每一行以卡片节点形式呈现，直观展示创作全貌
- **一站式工作流**：从脚本分析 → 画布组织 → 分镜图生成 → 视频生成，全链路闭环
- **可扩展性**：通过插件系统管理节点类型，未来可灵活扩展新的内容类型

---

## 调研总结

### 参考项目

#### 1. infinite-canvas-tutorial（xiaoiver）

一个完整的无限画布教程项目，涵盖从渲染引擎到协同编辑的全栈技术。

**关键技术选型：**
- 渲染引擎：基于 `@antv/g-device-api` 的 GPU 加速渲染（WebGL1/2 + WebGPU）
- 架构模式：ECS（Entity-Component-System），使用 Becsy 框架
- 插件系统：受 Webpack 启发，基于 tapable 钩子机制
- 形状系统：SDF 渲染基础图形，支持 GPU 加速文本渲染
- 场景图：树形结构，支持变换、层级、包围盒计算
- 相机系统：平移、缩放、旋转、动画过渡
- 事件系统：参考 DOM API 的 FederatedEvent 体系
- 性能优化：视口剔除（Culling）、合批（Batching）、空间索引

**插件接口设计（core 包）：**

```typescript
interface Plugin {
  apply: (context: PluginContext) => void
}

interface PluginContext {
  hooks: Hooks
  canvas: HTMLCanvasElement
}

interface Hooks {
  init: SyncHook<[]>
  initAsync: AsyncParallelHook<[]>
  destroy: SyncHook<[]>
  resize: SyncHook<[number, number]>
  beginFrame: SyncHook<[]>
  endFrame: SyncHook<[]>
}
```

**ECS 架构插件（ecs 包）：**

```typescript
// 定义组件
class MyComponent {
  @field({ type: Type.float32, default: 0 })
  declare value: number
}

// 定义系统
@system(Update)
class MySystem extends System {
  private canvas = this.query(q => q.current.with(Canvas).read)
  execute() { /* ... */ }
}

// 注册插件
const MyPlugin: Plugin = () => {
  component(MyComponent)
}
```

**对本项目的启发：**
- 插件系统的钩子生命周期设计
- 相机控制（平移/缩放）的实现模式
- 视口剔除和合批优化策略
- 形状系统的 SDF 渲染方案

#### 2. Constella（TiiJeiJ8）

一个基于 Vue 3 的实时协作无限画布应用，专注于结构化知识组织。

**技术选型：**
- 框架：Vue 3 + TypeScript
- 协同：基于 Yjs 的 CRDT 同步
- 状态管理：Composable 模式（与本项目一致）
- 渲染：HTML/CSS DOM 渲染（非 Canvas）

**插件系统设计：**

```typescript
interface NodePlugin {
  meta: PluginMeta        // 插件元数据
  renderer: Component     // Vue 渲染组件
  editor?: Component      // Vue 编辑器组件（可选）
  onDblClick?: (content) => boolean  // 自定义双击处理
}

interface PluginMeta {
  kind: string            // 唯一类型标识
  label: string           // 显示名称
  icon: string            // 图标
  description: string     // 描述
  editable: boolean       // 是否可编辑
  supportsCardMode: boolean
  supportsFontSizeControl: boolean
}

// 注册表 API
pluginRegistry.register(plugin)
pluginRegistry.get(kind)
pluginRegistry.getRenderer(kind)
pluginRegistry.getEditor(kind)
pluginRegistry.getRegisteredKinds()
```

**节点数据模型：**

```typescript
interface CanvasNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  content: {
    kind: string          // 对应插件 kind
    data: string          // 内容数据（JSON 序列化）
    displayMode: string   // 展示模式
  }
  zIndex: number
}
```

**连线模型：**

```typescript
interface CanvasEdge {
  sourceId: string
  targetId: string
  sourceAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center'
  targetAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center'
  type: 'straight' | 'bezier' | 'step'
  color: string
  strokeWidth: number
  startArrow: 'none' | 'arrow' | 'diamond' | 'circle'
  endArrow: 'none' | 'arrow' | 'diamond' | 'circle'
  label?: string
}
```

**内置节点类型：** blank、text、markdown、image、hyperlink、quote-card

**对本项目的启发：**
- Vue 组件作为节点渲染器的设计模式
- 插件注册表的 API 设计
- CRDT 协同的节点管理模式
- 节点连线的锚点与样式系统

---

## 技术方案选型

### 画布渲染策略

| 方案 | 优势 | 劣势 | 适合度 |
|------|------|------|--------|
| **A. DOM 渲染（类 Constella）** | 与 Vue 无缝集成、开发快、样式灵活 | 大量节点性能瓶颈 | ★★★★ |
| **B. Canvas2D 渲染** | 性能好、像素级控制 | 文本渲染复杂、无 DOM 事件 | ★★★ |
| **C. WebGL/WebGPU（类 infinite-canvas-tutorial）** | 极致性能、GPU 加速 | 开发成本极高、需自建渲染管线 | ★★ |
| **D. DOM + Canvas 混合** | 平衡性能与开发效率 | 架构复杂度增加 | ★★★ |

**选定方案：A. DOM 渲染（类 Constella 方案）**

理由：
1. 本项目已有 Vue 3 + shadcn-vue 组件库，DOM 方案与现有技术栈零成本融合
2. 节点内容包含 Markdown、图片、视频播放等富媒体，DOM 天然支持
3. 脚本分析场景的节点数量有限（通常 10-50 个），DOM 性能足够
4. 开发效率高，可快速验证产品假设
5. 后续如遇性能瓶颈，可局部引入 Canvas 虚拟化（方案 D）

### 插件系统策略

采用 **Constella 风格的插件注册表**，而非 infinite-canvas-tutorial 的 ECS 插件模式。

理由：
1. ECS 架构适合大规模实体管理（游戏引擎场景），对 10-50 个节点的画布过于重
2. Constella 的 Vue 组件即插件模式与本项目技术栈一致
3. 注册表 API 简洁直观，开发同学上手成本低

---

## 功能需求

### F1. 画布页面与路由

**路由配置：**
- 新增 `/canvas` 路由，对应 `CanvasPage.vue`
- 支持从分析结果页、生成结果页一键跳转至画布（携带脚本数据）

**页面布局：**
```
┌──────────────────────────────────────────────┐
│ AppLayout（顶部导航）                          │
├──────────┬───────────────────────┬───────────┤
│          │                       │           │
│ 左侧面板  │     无限画布区域        │ 右侧属性栏 │
│ (节点目录) │  (平移/缩放/选择)      │ (节点属性) │
│          │                       │           │
│          │                       │           │
├──────────┴───────────────────────┴───────────┤
│ 底部工具栏（缩放控制、节点类型选择）               │
└──────────────────────────────────────────────┘
```

### F2. 画布核心能力

#### F2.1 视口控制
- 鼠标拖拽平移画布（空格 + 拖拽 或 中键拖拽）
- 鼠标滚轮缩放（以鼠标位置为中心）
- 缩放范围：10% - 300%
- 快捷键：`Ctrl+0` 重置视图、`Ctrl+1` 适配全部、`Ctrl+2` 适配选中
- 底部缩放工具栏显示当前缩放比例

#### F2.2 网格背景
- 点状网格背景，随缩放动态调整密度
- 网格提供空间参考感

#### F2.3 节点选择与移动
- 单击选中节点，显示选中边框和变换手柄
- 拖拽移动节点，实时更新位置
- `Shift` 多选、框选多个节点
- 多选后可批量移动、删除
- 吸附网格（可开关）

#### F2.4 节点连线
- 从节点锚点拖出连线，连接到目标节点
- 支持贝塞尔曲线、直线、折线三种连线样式
- 连线支持箭头、颜色、标签配置
- 选中连线可删除

### F3. 节点类型（插件管理）

#### 内置节点类型

| kind | 名称 | 描述 | 编辑能力 |
|------|------|------|---------|
| `script` | 分镜卡片 | 从 VideoScriptItem 生成的分镜节点，展示景别、画面内容、口播等 | 可编辑所有字段 |
| `text` | 文本 | 纯文本内容节点 | 行内编辑 |
| `markdown` | Markdown | Markdown 富文本节点 | 打开编辑器 |
| `image` | 图片 | 展示图片，支持上传和 URL | 替换图片 |
| `video` | 视频 | 视频播放器节点 | 替换视频源 |
| `note` | 便签 | 轻量笔记节点，手写风格背景 | 行内编辑 |

#### 节点插件接口

```typescript
// src/canvas/plugins/types.ts

interface CanvasNodePlugin {
  /** 插件元数据 */
  meta: {
    kind: string                  // 唯一类型标识，如 'script'、'image'
    label: string                 // 显示名称
    icon: string                  // Lucide 图标名
    description: string           // 描述
    defaultWidth: number          // 默认宽度
    defaultHeight: number         // 默认高度
    minSize: { width: number; height: number }
    maxSize: { width: number; height: number }
    editable: boolean             // 是否支持编辑
    resizable: boolean            // 是否支持缩放
  }
  /** Vue 渲染组件 */
  renderer: Component
  /** Vue 编辑器组件（可选，为空则使用行内编辑） */
  editor?: Component
  /** 工具栏按钮点击创建时的回调（可选） */
  onCreate?: () => Record<string, any>
  /** 节点双击处理（可选，返回 true 阻止默认编辑） */
  onDblClick?: (node: CanvasNode) => boolean
  /** 右键菜单扩展（可选） */
  contextMenuItems?: ContextMenuItem[]
}
```

#### 插件注册表

```typescript
// src/canvas/plugins/registry.ts

class PluginRegistry {
  private plugins: Map<string, CanvasNodePlugin> = new Map()

  register(plugin: CanvasNodePlugin): void
  unregister(kind: string): void
  get(kind: string): CanvasNodePlugin
  getRenderer(kind: string): Component
  getEditor(kind: string): Component | null
  getMeta(kind: string): PluginMeta
  getAllMetas(): PluginMeta[]
  getRegisteredKinds(): string[]
  has(kind: string): boolean
}

export const pluginRegistry = new PluginRegistry()
```

### F4. 从脚本导入到画布

#### F4.1 一键导入分镜
- 在分析结果页 / 生成结果页点击「打开画布」按钮
- 将 `VideoScriptItem[]` 自动转换为画布节点
- 自动布局：按分镜序号从左到右、自动换行排列
- 每个分镜节点包含完整信息（景别、画面内容、口播、时间等）

#### F4.2 自动布局算法
- 水平流式布局（默认）：按序号从左到右排列，自动换行
- 网格布局：均匀分布到 N×M 网格
- 时间线布局：按时间轴纵向排列
- 支持手动拖拽调整后锁定

### F5. 画布内 AI 生成

#### F5.1 分镜图生成
- 选中分镜节点 → 右键「生成分镜图」或点击节点内生成按钮
- 调用现有的分镜图生成 API（基于画面内容 + 景别 + 运镜作为 prompt）
- 生成完成后图片自动注入到节点的 `image` 内容中
- 支持批量选中 → 批量生成

#### F5.2 视频片段生成
- 选中已有分镜图的节点 → 右键「生成视频片段」
- 基于分镜图 + 脚本描述生成短视频
- 生成完成后节点切换为视频播放模式

#### F5.3 AI 辅助节点
- 选中文本节点 → 右键「AI 扩写」/「AI 改写」
- 基于节点内容和上下文（相邻节点）调用文本生成 API
- 结果直接替换节点内容

### F6. 画布数据持久化

#### F6.1 本地存储
- 画布状态自动保存到 `localStorage`（防丢失）
- 存储内容：节点位置、大小、内容、连线、视口状态
- 每次操作后 debounce 500ms 自动保存

#### F6.2 Supabase 远程存储
- 已登录用户可保存画布到 Supabase
- 支持多个画布项目（项目列表管理）
- 表结构设计：

```sql
-- 画布项目表
CREATE TABLE canvas_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,                -- 画布缩略图 URL
  canvas_data JSONB NOT NULL,    -- 完整画布数据（节点+连线+视口）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 画布快照表（可选，支持版本历史）
CREATE TABLE canvas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES canvas_projects(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE canvas_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects"
  ON canvas_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own projects"
  ON canvas_projects FOR ALL USING (auth.uid() = user_id);
```

### F7. 导出能力

- 导出画布为 PNG 图片（含所有可见节点）
- 导出画布为 JSON（可重新导入）
- 导出画布中的脚本节点为 Excel（复用现有 `exportExcel.ts`）

---

## 技术实现概要

### 目录结构

```
src/
├── canvas/                          # 画布模块（新增）
│   ├── plugins/                     # 插件系统
│   │   ├── types.ts                 # 插件接口定义
│   │   ├── registry.ts              # 插件注册表
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
│   │   ├── useCanvasSelection.ts    # 选择状态管理
│   │   ├── useCanvasDrag.ts         # 节点拖拽逻辑
│   │   ├── useCanvasConnection.ts   # 连线拖拽逻辑
│   │   ├── useCanvasHistory.ts      # 撤销/重做
│   │   ├── useCanvasPersistence.ts  # 数据持久化
│   │   └── useCanvasLayout.ts       # 自动布局算法
│   ├── components/                  # 画布 UI 组件
│   │   ├── CanvasContainer.vue      # 画布容器（视口 + 事件监听）
│   │   ├── CanvasGrid.vue           # 网格背景
│   │   ├── CanvasNode.vue           # 节点通用外壳（选中态、拖拽、缩放）
│   │   ├── CanvasEdge.vue           # 连线渲染（SVG）
│   │   ├── CanvasEdgeLayer.vue      # 连线层
│   │   ├── CanvasNodeLayer.vue      # 节点层
│   │   ├── SelectionBox.vue         # 框选矩形
│   │   ├── ContextMenu.vue          # 右键菜单
│   │   ├── MiniMap.vue              # 小地图（可选）
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

### 核心类型定义

```typescript
// src/canvas/types.ts

/** 画布节点 */
export interface CanvasNode {
  id: string
  type: string                   // 对应插件 kind
  x: number
  y: number
  width: number
  height: number
  rotation: number               // 旋转角度（预留）
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

/** 画布连线 */
export interface CanvasEdge {
  id: string
  sourceId: string
  targetId: string
  sourceAnchor: AnchorPosition
  targetAnchor: AnchorPosition
  type: EdgeType
  style: EdgeStyle
  label?: string
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

/** 视口状态 */
export interface ViewportState {
  offsetX: number
  offsetY: number
  zoom: number                   // 0.1 ~ 3.0
}

/** 画布项目（持久化） */
export interface CanvasProject {
  id: string
  userId: string
  title: string
  description?: string
  thumbnail?: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: ViewportState
  createdAt: string
  updatedAt: string
}
```

### 核心状态管理（useCanvas）

```typescript
// src/canvas/composables/useCanvas.ts

// 模块级状态（单例模式，与 useVideoAnalysis 一致）
const nodes = ref<CanvasNode[]>([])
const edges = ref<CanvasEdge[]>([])
const viewport = ref<ViewportState>({ offsetX: 0, offsetY: 0, zoom: 1 })
const selectedNodeIds = ref<Set<string>>(new Set())
const selectedEdgeIds = ref<Set<string>>(new Set())
const projectId = ref<string | null>(null)

// 节点 CRUD
function addNode(node: CanvasNode): void
function updateNode(id: string, partial: Partial<CanvasNode>): void
function removeNode(id: string): void
function removeNodes(ids: string[]): void
function getNode(id: string): CanvasNode | undefined

// 连线 CRUD
function addEdge(edge: CanvasEdge): void
function updateEdge(id: string, partial: Partial<CanvasEdge>): void
function removeEdge(id: string): void
function removeEdgesByNode(nodeId: string): void

// z-index 管理
function bringToFront(id: string): void
function sendToBack(id: string): void

// 批量操作
function importFromScriptItems(items: VideoScriptItem[]): void
function clearCanvas(): void

// 序列化 / 反序列化
function serialize(): CanvasProject
function deserialize(data: CanvasProject): void
```

### 视口控制（useCanvasViewport）

```typescript
// src/canvas/composables/useCanvasViewport.ts

const { offsetX, offsetY, zoom } = toRefs(viewport)

// CSS transform 实现（DOM 方案）
const viewportTransform = computed(() =>
  `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoom.value})`
)

// 平移
function panBy(dx: number, dy: number): void
function panTo(x: number, y: number): void

// 缩放（以某点为中心）
function zoomBy(delta: number, centerX?: number, centerY?: number): void
function zoomTo(zoom: number, centerX?: number, centerY?: number): void

// 快捷视图
function resetView(): void
function fitAll(): void              // 适配全部节点
function fitSelection(): void        // 适配选中节点

// 屏幕坐标 → 画布坐标
function screenToCanvas(screenX: number, screenY: number): { x: number; y: number }

// 画布坐标 → 屏幕坐标
function canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number }
```

### 撤销/重做（useCanvasHistory）

基于快照的命令模式：

```typescript
interface HistoryAction {
  type: 'addNode' | 'removeNode' | 'updateNode' | 'moveNode' |
        'addEdge' | 'removeEdge' | 'updateEdge' | 'batch'
  payload: any
  inverse: () => HistoryAction  // 生成反向操作
}

// 最大历史记录数
const MAX_HISTORY = 50

function pushAction(action: HistoryAction): void
function undo(): void
function redo(): void
const canUndo: ComputedRef<boolean>
const canRedo: ComputedRef<boolean>
```

### 渲染架构

采用 **分层 DOM 结构**：

```html
<div class="canvas-viewport" @wheel="onWheel" @pointerdown="onPointerDown">
  <!-- 网格背景层（CSS background 或 SVG） -->
  <CanvasGrid />

  <!-- 连线层（SVG，不随节点 DOM 移动） -->
  <svg class="canvas-edge-layer" :style="transform">
    <CanvasEdge v-for="edge in edges" :key="edge.id" :edge="edge" />
  </svg>

  <!-- 节点层 -->
  <div class="canvas-node-layer" :style="viewportTransform">
    <CanvasNode v-for="node in sortedNodes" :key="node.id" :node="node">
      <!-- 动态渲染插件组件 -->
      <component :is="getRenderer(node.type)" :content="node.content" />
    </CanvasNode>
  </div>

  <!-- 框选层 -->
  <SelectionBox v-if="isSelecting" />

  <!-- UI 覆盖层（不受视口变换影响） -->
  <Toolbar />
  <ContextMenu />
</div>
```

**关键渲染优化：**
1. 节点层使用 CSS `transform` 实现平移/缩放（GPU 加速）
2. 连线层使用 SVG `transform`，与节点层同步
3. 视口外的节点添加 `visibility: hidden` 而非 `v-if`（避免重新挂载）
4. 节点数量 > 100 时启用虚拟化（只渲染视口内节点）

---

## 交互设计

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space + 拖拽` | 平移画布 |
| `鼠标滚轮` | 缩放画布 |
| `Ctrl+0` | 重置视图 |
| `Ctrl+1` | 适配全部 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `Delete / Backspace` | 删除选中 |
| `Ctrl+A` | 全选 |
| `Ctrl+D` | 复制选中节点 |
| `Ctrl+C / V` | 复制/粘贴 |
| `Escape` | 取消选择 |

### 右键菜单

```
┌─────────────────────────┐
│ ▶ 编辑                  │
│ ─────────────────────── │
│ ▶ 复制     Ctrl+D       │
│ ▶ 删除     Delete       │
│ ▶ 锁定位置              │
│ ─────────────────────── │
│ ▶ 置顶                  │
│ ▶ 置底                  │
│ ─────────────────────── │
│ ▶ 生成分镜图     (脚本) │
│ ▶ 生成视频片段   (脚本) │
│ ▶ AI 扩写        (文本) │
│ ─────────────────────── │
│ ▶ 连接到...             │
│ ▶ 导出节点为图片         │
└─────────────────────────┘
```

### 从结果页跳转

在 `ResultToolbar.vue` 和 `ScriptTable.vue` 中新增「打开画布」按钮：
- 点击后将当前 `scriptItems` 通过路由参数或 Pinia 传递
- 跳转到 `/canvas` 页面
- 自动调用 `importFromScriptItems()` 生成画布节点

---

## 分阶段实施计划

### Phase 1：画布核心（MVP）

**目标：** 可用的无限画布，支持脚本节点导入和基本操作

1. 画布基础框架
   - `CanvasContainer.vue`：视口容器 + 事件监听
   - `CanvasGrid.vue`：点状网格背景
   - `useCanvasViewport.ts`：平移、缩放
2. 节点系统
   - `CanvasNode.vue`：节点外壳（选中态、拖拽手柄）
   - 插件注册表 + 分镜卡片插件（`script` 类型）
   - `useCanvas.ts`：节点 CRUD
   - `useCanvasDrag.ts`：拖拽移动
3. 脚本导入
   - `importFromScriptItems()`：分镜 → 节点转换
   - 自动流式布局
   - 从分析页/生成页跳转按钮
4. 路由与页面
   - `/canvas` 路由
   - `CanvasPage.vue` 页面

### Phase 2：编辑与连线

**目标：** 完善节点交互，支持连线

1. 节点编辑
   - 分镜卡片编辑器
   - 节点缩放、旋转（预留）
2. 连线系统
   - `CanvasEdge.vue`（SVG 渲染）
   - 锚点拖拽创建连线
   - 贝塞尔曲线 / 直线 / 折线
3. 更多内置节点
   - `text`、`note` 插件
   - `image`、`video` 插件
   - `markdown` 插件
4. 右键菜单
5. 撤销/重做

### Phase 3：AI 生成集成

**目标：** 画布内直接触发 AI 生成

1. 分镜图生成
   - 选中节点 → 调用图片生成 API
   - 生成结果注入节点
   - 批量生成
2. 视频片段生成
   - 基于分镜图 + 描述生成视频
   - 节点切换为视频播放模式
3. AI 辅助编辑
   - 文本节点 AI 扩写 / 改写
   - 基于上下文的智能建议

### Phase 4：持久化与协作

**目标：** 项目保存与分享

1. 本地自动保存
2. Supabase 远程存储
3. 项目列表管理
4. 导出（PNG / JSON / Excel）
5. 小地图（MiniMap）

---

## 依赖评估

### 新增依赖

| 依赖 | 用途 | 体积（gzip） | 必要性 |
|------|------|-------------|--------|
| 无 | DOM 方案无需新增渲染依赖 | - | - |

**可选依赖（Phase 4）：**
- `html-to-image` — 导出画布为 PNG（~12KB）

### 不引入的依赖

| 依赖 | 原因 |
|------|------|
| `@infinite-canvas-tutorial/ecs` | ECS 架构过重，DOM 方案不需要 |
| `@antv/g-device-api` | GPU 渲染层，DOM 方案不需要 |
| `konva` / `fabric` | Canvas2D 库，与 DOM 方案冲突 |
| `yjs` | CRDT 协同为 Phase 4+ 考虑 |

---

## 数据流图

```
┌──────────────┐     scriptItems     ┌────────────────┐
│ AnalyzePage  │ ──────────────────▶ │   CanvasPage   │
│ CreatePage   │   (路由参数/状态)    │                │
└──────────────┘                     │  useCanvas     │
                                     │  ├─ nodes[]    │
                                     │  ├─ edges[]    │
                                     │  └─ viewport   │
                                     │                │
                                     │  PluginRegistry│
                                     │  ├─ script     │
                                     │  ├─ text       │
                                     │  ├─ image      │
                                     │  ├─ video      │
                                     │  └─ ...        │
                                     │                │
                                     │  AI Generation │
                                     │  ├─ 分镜图 ──▶ DashScope API
                                     │  ├─ 视频   ──▶ DashScope API
                                     │  └─ 文本   ──▶ DashScope API
                                     └────────────────┘
                                            │
                                     ┌──────┴──────┐
                                     │ Persistence │
                                     │ ├─ localStorage (自动)
                                     │ └─ Supabase (手动)
                                     └─────────────┘
```

---

## 风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| DOM 渲染在大量节点时卡顿 | 50+ 节点后可能出现 | 视口剔除（`visibility: hidden`）、100+ 节点虚拟化 |
| 连线 SVG 与节点层同步问题 | 平移/缩放时连线偏移 | 共享同一 transform 状态，统一更新 |
| 脚本导入自动布局效果不佳 | 节点重叠或间距不合理 | 提供多种布局算法，支持手动调整 |
| 撤销/重做内存占用 | 长时间编辑后内存增长 | 限制最大历史 50 条，快照增量存储 |
| 分镜图生成与画布节点的状态同步 | 生成中节点状态不一致 | 统一通过 useCanvas 更新，不绕过状态层 |

---

## 验收标准

### Phase 1 验收
- [ ] `/canvas` 页面可正常访问，显示网格背景
- [ ] 鼠标拖拽平移、滚轮缩放流畅无卡顿
- [ ] 从分析结果页点击「打开画布」后，分镜卡片正确展示
- [ ] 节点可拖拽移动，选中态清晰
- [ ] 底部工具栏显示缩放比例，支持重置视图

### Phase 2 验收
- [ ] 双击分镜卡片可编辑内容
- [ ] 可从节点锚点拖出连线连接两个节点
- [ ] 右键菜单功能正常
- [ ] 撤销/重做功能正常（Ctrl+Z / Ctrl+Shift+Z）
- [ ] 所有 6 种内置节点类型可用

### Phase 3 验收
- [ ] 选中分镜节点可触发生成分镜图
- [ ] 生成结果自动显示在节点内
- [ ] 批量生成进度可视化
- [ ] 文本节点 AI 辅助功能可用

### Phase 4 验收
- [ ] 画布自动保存到 localStorage
- [ ] 已登录用户可保存/加载项目到 Supabase
- [ ] 项目列表可正常管理（创建、删除、重命名）
- [ ] 导出 PNG / JSON 功能正常
