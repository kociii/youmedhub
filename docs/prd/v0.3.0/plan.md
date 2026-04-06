# v0.3.0 开发计划

> 为 YouMedHub 引入无限画布功能，实现脚本可视化组织和 AI 生成闭环

---

## 版本状态

```
v0.3.0 ⏳ 规划中
```

**版本目标**：
- 实现可用的无限画布，支持脚本节点导入和基本操作
- 完成插件系统，支持 6 种内置节点类型
- 实现节点连线和编辑能力
- 集成画布内 AI 生成（分镜图、视频片段）
- 实现画布数据持久化和导出

---

## 版本规划

```
v0.3.0-alpha  ──▶  v0.3.0-beta  ──▶  v0.3.0-stable
     │                │                   │
     │                │                   └── 验证完成
     │                │
     │                └── 完整功能 + 集成测试
     │
     └── 画布核心 + 插件系统 + 脚本导入
```

---

## 任务分解

### Phase 1：画布核心（MVP）

**目标：** 可用的无限画布，支持脚本节点导入和基本操作

| 任务 | 描述 | 状态 | 预计时间 |
|------|------|------|----------|
| P1-1 | 画布类型定义 `canvas/types.ts` | ⏳ | 0.5d |
| P1-2 | 插件注册表 `canvas/plugins/registry.ts` | ⏳ | 0.5d |
| P1-3 | 插件接口定义 `canvas/plugins/types.ts` | ⏳ | 0.5d |
| P1-4 | 核心状态管理 `useCanvas.ts`（节点/连线 CRUD） | ⏳ | 1d |
| P1-5 | 视口控制 `useCanvasViewport.ts`（平移/缩放/坐标转换） | ⏳ | 1d |
| P1-6 | 节点拖拽 `useCanvasDrag.ts` | ⏳ | 0.5d |
| P1-7 | 选择管理 `useCanvasSelection.ts`（单选/多选/框选） | ⏳ | 0.5d |
| P1-8 | CanvasContainer.vue（视口容器 + 事件监听） | ⏳ | 1d |
| P1-9 | CanvasGrid.vue（点状网格背景） | ⏳ | 0.5d |
| P1-10 | CanvasNode.vue（节点外壳：选中态、拖拽手柄） | ⏳ | 1d |
| P1-11 | Toolbar.vue（底部工具栏） | ⏳ | 0.5d |
| P1-12 | 分镜卡片插件 `plugins/builtins/script/` | ⏳ | 1d |
| P1-13 | 文本插件 `plugins/builtins/text/` | ⏳ | 0.5d |
| P1-14 | 自动布局 `useCanvasLayout.ts`（流式布局） | ⏳ | 0.5d |
| P1-15 | 脚本导入 `importFromScriptItems()` | ⏳ | 0.5d |
| P1-16 | CanvasPage.vue + `/canvas` 路由 | ⏳ | 0.5d |
| P1-17 | 从分析页/生成页添加「打开画布」按钮 | ⏳ | 0.5d |

**Phase 1 合计：约 10 天**

### Phase 2：编辑与连线

**目标：** 完善节点交互，支持连线和更多节点类型

| 任务 | 描述 | 状态 | 预计时间 |
|------|------|------|----------|
| P2-1 | 节点缩放手柄（四角拖拽 resize） | ⏳ | 0.5d |
| P2-2 | 分镜卡片编辑器 `ScriptEditor.vue` | ⏳ | 1d |
| P2-3 | 连线系统 `useCanvasConnection.ts` | ⏳ | 1d |
| P2-4 | CanvasEdge.vue（SVG 贝塞尔/直线/折线） | ⏳ | 1d |
| P2-5 | CanvasEdgeLayer.vue（连线层容器） | ⏳ | 0.5d |
| P2-6 | 锚点显示与拖拽逻辑 | ⏳ | 0.5d |
| P2-7 | 图片插件 `plugins/builtins/image/` | ⏳ | 0.5d |
| P2-8 | 视频插件 `plugins/builtins/video/` | ⏳ | 0.5d |
| P2-9 | 便签插件 `plugins/builtins/note/` | ⏳ | 0.5d |
| P2-10 | Markdown 插件 `plugins/builtins/markdown/` | ⏳ | 0.5d |
| P2-11 | 右键菜单 `ContextMenu.vue` | ⏳ | 1d |
| P2-12 | 撤销/重做 `useCanvasHistory.ts` | ⏳ | 1d |
| P2-13 | 快捷键系统 | ⏳ | 0.5d |
| P2-14 | 左侧面板节点目录 | ⏳ | 0.5d |
| P2-15 | 右侧属性栏 | ⏳ | 0.5d |
| P2-16 | z-index 管理（置顶/置底） | ⏳ | 0.5d |

**Phase 2 合计：约 10 天**

### Phase 3：AI 生成集成

**目标：** 画布内直接触发 AI 生成

| 任务 | 描述 | 状态 | 预计时间 |
|------|------|------|----------|
| P3-1 | 分镜图生成 API 集成 | ⏳ | 1d |
| P3-2 | 分镜图生成 UI（节点内进度展示） | ⏳ | 1d |
| P3-3 | 批量分镜图生成（多选 → 批量） | ⏳ | 0.5d |
| P3-4 | 视频片段生成 API 集成 | ⏳ | 1d |
| P3-5 | 视频片段生成 UI | ⏳ | 1d |
| P3-6 | AI 文本扩写/改写 | ⏳ | 0.5d |
| P3-7 | AI 生成状态管理（loading/success/error） | ⏳ | 0.5d |

**Phase 3 合计：约 5.5 天**

### Phase 4：持久化与导出

**目标：** 项目保存与分享

| 任务 | 描述 | 状态 | 预计时间 |
|------|------|------|----------|
| P4-1 | localStorage 自动保存 `useCanvasPersistence.ts` | ⏳ | 0.5d |
| P4-2 | Supabase 表结构创建（canvas_projects） | ⏳ | 0.5d |
| P4-3 | Supabase CRUD 操作 | ⏳ | 1d |
| P4-4 | 项目列表管理页 | ⏳ | 1d |
| P4-5 | 导出 PNG（html-to-image） | ⏳ | 0.5d |
| P4-6 | 导出 JSON（序列化/反序列化） | ⏳ | 0.5d |
| P4-7 | 导出 Excel（复用 exportExcel.ts） | ⏳ | 0.5d |
| P4-8 | MiniMap 小地图（可选） | ⏳ | 1d |
| P4-9 | 画布快照/版本历史（可选） | ⏳ | 1d |

**Phase 4 合计：约 6.5 天**

---

## 总时间估算

| 阶段 | 内容 | 预计时间 | 依赖 |
|------|------|----------|------|
| Phase 1 | 画布核心 MVP | ~10d | 无 |
| Phase 2 | 编辑与连线 | ~10d | Phase 1 |
| Phase 3 | AI 生成集成 | ~5.5d | Phase 1 |
| Phase 4 | 持久化与导出 | ~6.5d | Phase 1 |

**总计：约 32 天（6.5 周）**

Phase 2 和 Phase 3 可部分并行（AI 生成不依赖连线系统）。

---

## 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DOM 渲染性能瓶颈 | 50+ 节点后可能卡顿 | Phase 1 预留视口剔除逻辑，Phase 2 虚拟化 |
| 连线 SVG 同步问题 | 平移/缩放时连线偏移 | 共享 transform 状态，早期验证 |
| 分镜图/视频生成 API 不稳定 | Phase 3 阻塞 | Phase 3 可延后，不影响核心画布功能 |
| 自动布局效果不理想 | 用户需大量手动调整 | 提供多种布局算法 + 手动调整 |
| 手机端体验差 | 移动端操作困难 | Phase 4+ 再考虑移动端适配 |

---

## 里程碑

- **M1（Phase 1 完成）**：可从分析页导入脚本到画布，基本拖拽移动
- **M2（Phase 2 完成）**：完整的编辑和连线能力，6 种节点类型可用
- **M3（Phase 3 完成）**：画布内 AI 生成闭环
- **M4（Phase 4 完成）**：持久化保存，可导出分享
