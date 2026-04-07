# v0.3.0 技术开发文档

> 项目模块与全屏项目画布（MVP）

---

## 1. 当前架构审查

参考文件：

- `src/App.vue`
- `src/router/index.ts`
- `src/components/layout/AppLayout.vue`
- `src/components/layout/AppMenu.vue`
- `src/components/RightPanel.vue`
- `src/components/ResultToolbar.vue`
- `src/composables/useVideoAnalysis.ts`

### 当前架构结论

- 当前 `src/App.vue` 默认将页面包在 `AppLayout` 中。
- 当前共有 8 个业务页面；新增 `/projects` 与 `/projects/:id` 后将扩展为 10 个页面。
- `useVideoAnalysis` 足够提供“从脚本结果创建项目”的输入来源。
- 因为项目是独立板块，所以 v0.3.0 不能只靠浏览器本地临时态，必须落 Supabase 项目主数据。

---

## 2. 目标架构

```
主应用标签页
┌────────────────────────────────────────────────┐
│ AppLayout 三栏壳层                             │
│ 首页 / 拆解 / 创作 / 项目列表 / 历史 / 设置     │
└────────────────────────────────────────────────┘
                  │
                  │ 新建项目 / 打开项目
                  ▼
项目标签页
┌────────────────────────────────────────────────┐
│ /projects/:id                                  │
│ 独立全屏项目画布                               │
└────────────────────────────────────────────────┘
```

---

## 3. 路由与布局策略

### 3.1 路由建议

- `/projects`
  - 继续使用 `AppLayout`
- `/projects/:id`
  - 设置 `meta.standalone = true`
  - 直接渲染全屏项目画布
- `/share/projects/:token`
  - 公开分享页（只读）
  - 同样建议走 `meta.standalone = true`
  - 当前已落地基础只读渲染，后续继续增强分享态画布交互

### 3.2 `App.vue` 布局分流

- 普通页面：走 `AppLayout`
- `standalone` 页面：直接渲染项目画布

这样项目画布才能真正全屏。

---

## 4. 项目创建链路

### 4.1 从分析/创作结果创建项目

建议不再使用 `launchToken` 传大对象，而是改为：

1. 当前页调用 `createProjectFromScript()`
2. 直接在 Supabase 创建项目主记录
3. 直接在 Supabase 创建初始项目快照
4. 返回 `projectId`
5. `window.open('/projects/{projectId}', '_blank', 'noopener')`

### 4.2 为什么这样更合适

- 项目本来就需要被“管理”和“再次打开”
- 提前写入数据库后，新标签页只需要按 `projectId` 拉取
- 结构更符合“独立功能板块”的长期方向

### 4.3 手动新建空白项目

建议链路：

1. 在 `/projects` 点击“新建项目”
2. 创建 `projects` 主记录
3. 创建 `project_snapshots` 的初始空白快照（`version = 1`）
4. 新标签页打开 `/projects/{projectId}`

---

## 5. 页面级接口建议

### 5.1 项目管理页

- `GET /projects`
  - 分页获取当前用户项目列表
- `POST /projects`
  - 手动创建空白项目
- `PATCH /projects/:id`
  - 修改标题、描述、封面、归档状态

### 5.2 从脚本创建项目

- `POST /projects/from-script`
  - 输入：
    - `sourceType`
    - `title`
    - `markdown`
    - `scriptItems`
    - `sourceRefId?`
  - 输出：
    - `projectId`
    - `snapshotId`
    - `version`

### 5.3 项目画布页

- `GET /projects/:id`
  - 获取项目主信息
- `GET /projects/:id/snapshots/latest`
  - 获取最新快照
- `POST /projects/:id/snapshots`
  - 保存新快照

---

## 6. 数据结构建议

### 5.1 项目主表

- 保存项目标题、来源、状态、统计信息

### 5.2 项目快照表

- 保存某一次项目画布状态
- 首次从脚本进入时，会生成 `initial_import` 快照

### 5.3 项目资源表

- 预留后续图片/视频等文件元数据
- 实际文件统一走阿里云 OSS，Supabase 只保存元数据

### 5.4 项目分享表（后续版本启用）

- 预留 `project_shares`
- 对外提供公开分享链接时，不直接暴露项目主表和完整编辑态
- 分享页面优先读取分享快照或分享负载

---

## 7. 与当前代码的集成点

### `src/components/layout/AppMenu.vue`

- 新增“项目”菜单项，进入 `/projects`

### `src/components/ResultToolbar.vue`

- 新增“新建项目”按钮
- 从 `useVideoAnalysis` 读取当前激活脚本
- 调用项目创建接口并新标签页打开

### `src/router/index.ts`

- 新增 `/projects`
- 新增 `/projects/:id`
- 新增 `/share/projects/:token`

### `src/App.vue`

- 需要支持 `standalone` 路由跳过 `AppLayout`

---

## 8. 建议新增模块

```txt
src/projects/
├── api/
│   ├── projects.ts
│   └── projectShares.ts
├── composables/
│   ├── useProjects.ts
│   └── useProjectCanvas.ts
├── components/
│   ├── ProjectCard.vue
│   └── ProjectCanvasNode.vue
└── utils/
    ├── buildInitialProjectSnapshot.ts
    └── mapScriptItemsToProjectCards.ts
```

---

## 9. 数据库存储建议

- **Supabase**
  - `projects`
  - `project_snapshots`
  - `project_assets`
  - `project_shares`（后续公开分享启用）

- **阿里云 OSS**
  - 统一保存后续项目相关图片、视频、缩略图等真实文件

SQL 交付建议独立维护在：

- `supabase/project_0_3_schema.sql`

---

## 10. 风险与应对

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 只做画布不做项目管理，模块无法闭环 | 高 | v0.3.0 同步交付 `/projects` |
| 继续用内存态传数据导致新标签页丢失 | 高 | 改为先建项目、再用 `projectId` 打开 |
| 过早堆入连线/AI 导致延期 | 高 | 严格后移到 0.3.1 / 0.3.2 |
