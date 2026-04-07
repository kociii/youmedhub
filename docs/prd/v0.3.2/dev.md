# v0.3.2 技术开发文档

> 项目连线、导出与项目内 AI 的实现建议

---

## 当前基线

参考文件：

- `src/router/index.ts`
- `src/components/layout/AppLayout.vue`
- `src/components/ResultToolbar.vue`
- `src/composables/useVideoAnalysis.ts`
- `src/views/ProjectCanvasPage.vue`
- `src/projects/types.ts`

### 结论

- `useVideoAnalysis` 仍可提供脚本来源，但项目本身已有独立数据模型。
- AI 任务状态不应继续堆入 `useVideoAnalysis`。
- 画布文件存储统一走阿里云 OSS；Supabase 仅保存可检索、可恢复的结构化元数据。
- 项目内 AI 调用统一复用现有阿里百炼通道（`src/api/analysis.ts` + `src/api/providers/aliyun.ts`），保持“一套 Key、多种能力”。
- 当前画布交互已经开始受节点规则和主题模式影响，本版需要把这些规则固化到类型和交互层，而不是散落在页面分支中。

---

## 模块建议

```txt
src/projects/
├── composables/
│   ├── useProjectConnections.ts
│   ├── useProjectExport.ts
│   └── useProjectAi.ts
├── components/
│   ├── ProjectEdgeLayer.vue
│   └── ProjectExportMenu.vue
└── api/
    ├── projects.ts
    └── projectAi.ts
```

建议补充 AI 卡片执行模块：

```txt
src/projects/
├── composables/
│   └── useProjectAiCards.ts
└── types/
    └── project-ai.ts
```

数据库与存储建议：

- **阿里云 OSS**
  - 保存 `image` / `video` / `thumbnail` 等真实文件
  - 对象键建议使用 `canvas/{user_id}/{project_id}/{yyyy}/{mm}/{filename}`

- **Supabase**
  - `projects`：项目主记录
  - `project_snapshots`：节点/连线快照
  - `project_assets`：OSS 文件元数据
  - `project_shares`：公开分享记录

---

## 技术重点

- `useProjectConnections.ts`
  - 连线数据结构
  - 锚点计算
  - 选中与删除
  - 校验节点是否允许连线

- `useProjectAi.ts`
  - 复用现有模型配置与百炼统一 API Key
  - 但单独维护画布节点级任务状态
  - AI 生成的图片/视频结果统一先落 OSS，再写入 `project_assets`

- `useProjectTheme.ts`
  - 管理浅色 / 暗黑主题状态
  - 为画布背景、节点卡片、连线图层输出主题 token

- `projectShares.ts`
  - 生成分享 token
  - 绑定一个项目版本或分享负载
  - 控制是否启用、是否过期

---

## `ai_call` 数据模型建议

```ts
type AiCardOutputType = 'text' | 'markdown' | 'json' | 'image' | 'video' | 'script'
type AiCardRunStatus = 'idle' | 'running' | 'success' | 'error'

interface AiCallCardConfig {
  modelId: string
  promptTemplate: string
  inputBindings: Array<{ nodeId: string; path?: string }>
  outputType: AiCardOutputType
}

interface AiCallCardResult {
  status: AiCardRunStatus
  outputType: AiCardOutputType
  content: unknown
  errorMessage?: string
  finishedAt?: string
}
```

实现约束：

1. `outputType` 必填且只允许枚举值。
2. 执行结果写回当前 `ai_call` 卡片的结果区。
3. `image/video` 结果先上传 OSS，再记录到 `project_assets`，卡片只保存元数据引用。

## 连线规则建议

- `note` 节点在 schema 层增加 `connectable: false` 或等效约束。
- 连线创建前必须校验源节点和目标节点的可连线状态。
- 左侧节点添加区和属性栏都应明确展示 `note` 节点“不参与连线”的角色。

---

## 公开分享建议

### 路由

- 编辑态：`/projects/:id`
- 分享态：`/share/projects/:token`

### 权限模型

- 编辑态：仅项目所有者可访问
- 分享态：任何拿到分享链接的用户均可访问只读页

### 数据读取建议

公开分享页不要直接开放读取 `projects` 或 `project_snapshots` 全表，建议：

1. 使用 `project_shares` 保存公开可读的分享记录
2. 分享记录中绑定：
   - `project_id`
   - `snapshot_id`
   - `share_token`
   - `share_payload`
3. 分享页优先读取 `share_payload`，必要时回查 `snapshot_id`

这样可以把“公开可见的数据”和“私有编辑数据”隔离开。

---

## SQL 交付

本版本需要配套执行 Supabase SQL，建议独立维护在：

- `supabase/project_0_3_schema.sql`

由你在 Supabase SQL Editor 手动执行。

---

## 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AI 能力不稳定拖慢版本 | 高 | 将 AI 保持为 P1，可与连线/云端并行 |
| 本地与云端数据冲突 | 高 | 增加版本号与更新时间对比 |
