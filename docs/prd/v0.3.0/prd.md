# v0.3.0 无限画布编辑器

## 版本概述

v0.3.0 为 YouMedHub 引入无限画布（Infinite Canvas）功能，让用户在 AI 生成脚本后，能在一个自由布局的画布上以节点形式组织脚本、文本、图片、视频等素材，并基于画布节点直接触发生成图片/视频的 AI 能力。画布引擎采用 DOM 渲染策略（受 Constella 启发），插件系统管理节点类型，视口控制和坐标变换参考 infinite-canvas-tutorial 的 Camera 架构。

| 需求 | 描述 | 优先级 | 相关文档 |
|------|------|--------|----------|
| F1 | 画布页面与路由 | P0 | design.md / dev.md |
| F2 | 画布核心能力（视口、网格、选择、拖拽） | P0 | design.md / dev.md |
| F3 | 节点插件系统（6 种内置节点） | P0 | dev.md |
| F4 | 脚本导入画布（一键导入 + 自动布局） | P0 | dev.md |
| F5 | 节点连线系统 | P1 | design.md / dev.md |
| F6 | 画布内 AI 生成（分镜图、视频片段） | P1 | dev.md |
| F7 | 撤销/重做 | P1 | dev.md |
| F8 | 画布数据持久化（本地 + Supabase） | P2 | dev.md |
| F9 | 导出能力（PNG / JSON / Excel） | P2 | dev.md |

---

## 调研总结

### 参考项目

#### 1. infinite-canvas-tutorial（xiaoiver）

一个完整的无限画布教程项目（33 课），涵盖从渲染引擎到协同编辑的全栈技术。

**架构演进**：
- `core` 包：OOP + tapable 钩子插件（Lesson 1-17）
- `ecs` 包：ECS 重构版，基于 Becsy（Lesson 18+）
- `webcomponents` 包：Lit + Custom Element 封装

**核心技术要点**：

| 领域 | 方案 |
|------|------|
| 渲染引擎 | GPU 加速（WebGL1/2 + WebGPU），基于 `@antv/g-device-api` |
| 插件系统（core） | tapable 钩子：`SyncHook`、`AsyncParallelHook`、`SyncWaterfallHook` |
| 插件系统（ecs） | Bevy 风格函数插件：`Plugin = () => { component(...); system(...) }` |
| 场景图 | 父子树结构，Transform 层级传播，FractionalIndex 排序 |
| 相机系统 | 2D 正交投影，Landmark 动画过渡，坐标空间转换 |
| 事件系统 | DOM 兼容 FederatedEvent，支持 capture/bubble 传播 |
| 性能优化 | RBush 空间索引视口剔除，Instanced 合批渲染，脏标记传播 |
| 历史系统 | Command Pattern，双栈（undo/redo），增量逆操作 |
| 状态管理 | SerializedNode + versioned history + 外部 StateManagement 接口 |

**Core 插件钩子生命周期**（来自 Lesson 1）：

```typescript
interface Hooks {
    init: SyncHook<[]>;                    // 同步初始化
    initAsync: AsyncParallelHook<[]>;      // 异步并行初始化（GPU 设备创建）
    destroy: SyncHook<[]>;                 // 销毁
    resize: SyncHook<[number, number]>;    // 尺寸变更
    beginFrame: SyncHook<[]>;             // 帧渲染前（视口剔除在此执行）
    endFrame: SyncHook<[]>;               // 帧渲染后
    pointerDown: SyncHook<[PointerEvent]>; // 输入事件
    pointerUp: SyncHook<[PointerEvent]>;
    pointerMove: SyncHook<[PointerEvent]>;
    pointerWheel: SyncHook<[PointerEvent]>;
    cameraChange: SyncHook<[]>;           // 相机状态变更
}
```

**ECS 插件注册模式**（来自 context7）：

```typescript
// 定义组件
class MyComponent {
  @field({ type: Type.float32, default: 0 })
  declare value: number;
}

// 定义系统
@system(Update)
class MySystem extends System {
  private canvas = this.query(q => q.current.with(Canvas).read);
  execute() { /* ... */ }
}

// 注册为插件
const MyPlugin: Plugin = () => {
  component(MyComponent);
};

// 使用
const app = new App().addPlugins(...DefaultPlugins, MyPlugin);
await app.run();
```

**Camera API**（来自 context7）：

```typescript
// 创建 Landmark 动画过渡
const landmark = api.createLandmark({ zoom: 2, x: 500, y: 300, rotation: 0 });
api.gotoLandmark(landmark, { duration: 500, easing: 'ease' });

// 缩放
api.zoomTo(1.5, { duration: 300, easing: 'ease' });
api.fitToScreen({ duration: 300, easing: 'ease' });

// 坐标转换
api.viewport2Canvas(viewportPos);  // 视口 → 画布
api.canvas2Viewport(canvasPos);    // 画布 → 视口
api.getViewportBounds();           // 获取可见区域边界
```

**History 系统**（来自 Lesson 19）：

```typescript
// 基于逆操作的双栈历史
class History {
    record(elementsChange, appStateChange) {
        const entry = HistoryEntry.create(appStateChange, elementsChange);
        if (!entry.isEmpty()) {
            this.#undoStack.push(entry.inverse());
            if (!entry.elementsChange.isEmpty()) {
                this.#redoStack.length = 0;
            }
        }
    }
}
```

**视口剔除**（来自 Lesson 8）：

```typescript
// RBush 空间索引 + AABB 碰撞检测
hooks.beginFrame.tap(() => {
    const { minX, minY, maxX, maxY } = this.#viewport;
    traverse(root, (shape) => {
        if (shape.renderable && shape.cullable) {
            const bounds = shape.getBounds();
            shape.culled = bounds.minX >= maxX || bounds.minY >= maxY
                        || bounds.maxX <= minX || bounds.maxY <= minY;
        }
        return shape.culled;
    });
});
```

**对本项目启发**：
- 相机系统的坐标空间转换（viewport ↔ canvas）和 Landmark 动画模式
- 插件钩子生命周期（init → beginFrame → endFrame → destroy）
- 脏标记传播模式（transform → bounds → render 级联脏标记）
- History 的逆操作命令模式
- 视口剔除策略（遍历 + AABB 检测，简单高效）

#### 2. Constella（TiiJeiJ8）

一个基于 Vue 3 的实时协作无限画布应用，专注于结构化知识组织。

**技术选型**：
- 框架：Vue 3 + TypeScript + Vite + Electron
- 协同：基于 Yjs 的 CRDT 同步
- 渲染：HTML/CSS DOM（非 Canvas/WebGL）
- 状态管理：Composable 模式（与本项目一致）

**插件系统**（来自 context7）：

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
  editable: boolean
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

**节点数据模型**（来自 context7 useYjsNodes）：

```typescript
interface CanvasNode {
  id: string
  x: number; y: number
  width: number; height: number
  fill: string; stroke: string
  content: {
    kind: string          // 对应插件 kind
    data: string          // 内容数据（JSON 序列化）
    displayMode: string   // 展示模式
  }
  zIndex: number
}

// CRUD API
createNode(newNode)
updateNode('node-id', { width: 250, height: 180, fill: '#10b981' })
updateNodePosition('node-id', 300, 400)   // 拖拽时高频调用
updateNodeContent('node-id', '# 新标题')
updateNodeKind('node-id', 'text')
deleteNodes(['node-1', 'node-2'])
```

**连线模型**（来自 context7 useYjsEdges）：

```typescript
interface CanvasEdge {
  sourceId: string; targetId: string
  sourceAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center'
  targetAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center'
  type: 'straight' | 'bezier' | 'step'
  color: string; strokeWidth: number
  dashArray?: number[]
  startArrow: 'none' | 'arrow' | 'diamond' | 'circle'
  endArrow: 'none' | 'arrow' | 'diamond' | 'circle'
  label?: string; labelPosition: number  // 0-1
  zIndex: number
}

// CRUD API
createEdge({ sourceId, targetId, sourceAnchor, targetAnchor, type: 'bezier', ... })
updateEdge(edgeId, { color: '#ef4444', strokeWidth: 3 })
deleteEdgesByNode('node-1')  // 节点删除时清理连线
getEdgesByNode('node-2')     // 获取节点所有连线
```

**内置节点类型**：blank、text、markdown、image、hyperlink、quote-card

**对本项目启发**：
- Vue 组件作为节点渲染器的设计模式——与本项目技术栈零成本融合
- 插件注册表的 API 设计简洁直观
- `updateNodePosition` 分离高频拖拽更新，避免触发完整 diff
- CRDT 协同的节点管理模式（Phase 4 参考）
- 连线锚点系统（5 个方向 × 3 种线型 × 4 种箭头）

---

## 技术方案选型

### 画布渲染策略

| 方案 | 优势 | 劣势 | 适合度 |
|------|------|------|--------|
| **A. DOM 渲染（类 Constella）** | 与 Vue 无缝集成、开发快、样式灵活、富媒体天然支持 | 大量节点性能瓶颈 | ★★★★ |
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
6. infinite-canvas-tutorial 的 GPU 渲染适合数千节点场景，对本项目 10-50 个节点场景过于沉重

### 插件系统策略

采用 **Constella 风格的插件注册表**，而非 infinite-canvas-tutorial 的 ECS 插件模式。

理由：
1. ECS 架构适合大规模实体管理（游戏引擎场景），对 10-50 个节点的画布过重
2. Constella 的 Vue 组件即插件模式与本项目技术栈一致
3. 注册表 API 简洁直观，开发同学上手成本低

**借鉴 infinite-canvas-tutorial 的部分**：
- 相机系统的坐标空间转换 API（viewport ↔ canvas）
- 视口剔除策略（AABB 检测）
- 脏标记传播模式
- History 的逆操作命令模式

---

## 功能需求

### F1. 画布页面与路由

**路由配置**：
- 新增 `/canvas` 路由，对应 `CanvasPage.vue`
- 支持从分析结果页、生成结果页一键跳转至画布（携带脚本数据）
- 路由参数：`?projectId=xxx`（加载已保存项目）

**页面布局**（详见 design.md）：

```
┌──────────────────────────────────────────────────┐
│ AppLayout（顶部导航）                              │
├──────────┬───────────────────────┬───────────────┤
│          │                       │               │
│ 左侧面板  │     无限画布区域        │ 右侧属性栏    │
│ (节点目录) │  (平移/缩放/选择)      │ (节点属性)    │
│          │                       │               │
├──────────┴───────────────────────┴───────────────┤
│ 底部工具栏（缩放控制、节点类型选择）                  │
└──────────────────────────────────────────────────┘
```

### F2. 画布核心能力

#### F2.1 视口控制

参考 infinite-canvas-tutorial 的 Camera API 设计：

- 鼠标拖拽平移画布（空格 + 拖拽 或 中键拖拽）
- 鼠标滚轮缩放（以鼠标位置为中心）
- 缩放范围：10% - 300%
- 快捷键：`Ctrl+0` 重置视图、`Ctrl+1` 适配全部、`Ctrl+2` 适配选中
- 底部缩放工具栏显示当前缩放比例
- 坐标空间转换：`screenToCanvas()` / `canvasToScreen()`（参考 infinite-canvas-tutorial 的 viewport2Canvas / canvas2Viewport）
- 视口边界计算：`getViewportBounds()` 返回可见区域的 canvas 坐标

#### F2.2 网格背景

- 点状网格背景，随缩放动态调整密度
- 网格提供空间参考感

#### F2.3 节点选择与移动

- 单击选中节点，显示选中边框和变换手柄
- 拖拽移动节点，实时更新位置（参考 Constella 的 `updateNodePosition` 高频更新模式）
- `Shift` 多选、框选多个节点
- 多选后可批量移动、删除
- 吸附网格（可开关）

#### F2.4 节点连线

参考 Constella 的 CanvasEdge 模型：

- 从节点锚点拖出连线，连接到目标节点
- 支持贝塞尔曲线、直线、折线三种连线样式
- 连线支持箭头（none/arrow/diamond/circle）、颜色、标签配置
- 选中连线可删除
- 节点删除时自动清理关联连线（`deleteEdgesByNode`）

### F3. 节点插件系统

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

参考 Constella 的 `NodePlugin` 设计，结合本项目需求扩展：

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
  /** 工具栏按钮点击创建时的回调 */
  onCreate?: () => Record<string, any>
  /** 节点双击处理（返回 true 阻止默认编辑） */
  onDblClick?: (node: CanvasNode) => boolean
  /** 右键菜单扩展 */
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

### F4. 脚本导入到画布

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

### F5. 节点连线系统

- 从节点锚点拖出连线，连接到目标节点
- 连线使用 SVG 渲染（与节点层共享 transform）
- 支持贝塞尔曲线、直线、折线三种连线样式
- 连线支持箭头、颜色、标签配置
- 节点移动时连线自动跟随

### F6. 画布内 AI 生成

#### F6.1 分镜图生成

- 选中分镜节点 → 右键「生成分镜图」或点击节点内生成按钮
- 调用图片生成 API（基于画面内容 + 景别 + 运镜作为 prompt）
- 生成完成后图片自动注入到节点的 `image` 内容中
- 支持批量选中 → 批量生成

#### F6.2 视频片段生成

- 选中已有分镜图的节点 → 右键「生成视频片段」
- 基于分镜图 + 脚本描述生成短视频
- 生成完成后节点切换为视频播放模式

#### F6.3 AI 辅助节点

- 选中文本节点 → 右键「AI 扩写」/「AI 改写」
- 基于节点内容和上下文（相邻节点）调用文本生成 API
- 结果直接替换节点内容

### F7. 撤销/重做

参考 infinite-canvas-tutorial 的 History 系统（Lesson 19），采用逆操作命令模式：

- 双栈（undo stack / redo stack）管理
- 最大历史 50 条
- 每次操作记录逆操作
- 支持批量操作合并为单条历史
- 快捷键：`Ctrl+Z` 撤销、`Ctrl+Shift+Z` 重做

### F8. 画布数据持久化

#### F8.1 本地存储

- 画布状态自动保存到 `localStorage`（防丢失）
- 存储内容：节点位置、大小、内容、连线、视口状态
- 每次操作后 debounce 500ms 自动保存

#### F8.2 Supabase 远程存储

- 已登录用户可保存画布到 Supabase
- 支持多个画布项目（项目列表管理）
- 表结构设计（详见 dev.md）

### F9. 导出能力

- 导出画布为 PNG 图片（含所有可见节点）
- 导出画布为 JSON（可重新导入）
- 导出画布中的脚本节点为 Excel（复用现有 `exportExcel.ts`）

---

## 交互设计

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space + 拖拽` | 平移画布 |
| `鼠标滚轮` | 缩放画布 |
| `Ctrl+0` | 重置视图 |
| `Ctrl+1` | 适配全部 |
| `Ctrl+2` | 适配选中 |
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
- 点击后将当前 `scriptItems` 通过路由参数或状态传递
- 跳转到 `/canvas` 页面
- 自动调用 `importFromScriptItems()` 生成画布节点

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
