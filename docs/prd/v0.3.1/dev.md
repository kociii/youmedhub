# v0.3.1 技术开发文档

> 项目编辑增强的技术方案

---

## 当前基线

参考文件：

- `src/App.vue`
- `src/router/index.ts`
- `src/components/layout/AppLayout.vue`
- `src/components/ResultToolbar.vue`
- `src/views/ProjectCanvasPage.vue`
- `src/projects/types.ts`

### 结论

- `v0.3.0` 已提供项目管理与全屏项目画布。
- `v0.3.1` 主要在项目编辑器内增量演进，不大改主应用业务流。
- 当前项目画布基于 DOM 卡片，不需要为媒体节点再引入其他底层渲染方案。

---

## 模块扩展建议

```txt
src/projects/
├── components/
│   ├── ProjectInspector.vue
│   ├── ProjectOutline.vue
│   └── ProjectImageUploader.vue
├── composables/
│   ├── useProjectHistory.ts
│   ├── useProjectAssets.ts
│   └── useProjectEditor.ts
└── plugins/
    ├── text/
    └── image/
```

---

## 技术重点

- `useProjectHistory.ts`
  - 只处理本地编辑历史
  - 支持撤销/重做

- `useProjectAssets.ts`
  - 负责阿里云 OSS 上传
  - 负责把资产元数据写入 `project_assets`

- `useProjectEditor.ts`
  - 聚合节点选中、属性修改、节点缩放、多选框选
  - 作为项目画布页的编辑器状态入口

- OSS 文件策略
  - `image` 节点上传后的实际文件统一存入阿里云 OSS
  - 本地项目中只保存 `bucket / object_key / oss_url / public_url / metadata`
  - 不再依赖浏览器临时 `blob:` 地址做跨会话恢复

- 媒体节点渲染
  - `image` / `video` 节点主内容区域使用 DOM 媒体元素
  - 根据卡片尺寸和媒体原始宽高比做等比例适配
  - 媒体内容需要尽可能充满卡片，但不能拉伸变形

- 上传与资源库
  - 点击节点时弹出媒体操作浮层
  - 浮层动作：
    - 本地上传
    - 从资源库选择
  - 资源库来源于当前用户历史上传、历史生成的图片 / 视频资产

- 拖拽上传
  - 支持拖拽图片 / 视频文件到画布
  - 先完成本地校验，再上传 OSS，再写入 `project_assets`，最后创建节点或绑定节点

- 视频限制
  - 文件大小 > 100MB 时拒绝上传
  - 时长 > 5 分钟时拒绝上传
  - 所有校验必须在正式上传前完成

- 属性栏
  - 按节点类型拆分表单
  - 保持与节点数据结构一一对应

---

## 文件与数据分层

- **阿里云 OSS**：保存图片、视频、缩略图等实际文件
- **浏览器本地存储**：保存编辑临时态
- **Supabase**：保存项目主记录、快照与 OSS 文件元数据

---

## 编辑器接口建议

- `PATCH /projects/:id`
  - 更新项目标题、描述、封面
- `POST /projects/:id/assets`
  - 写入 OSS 文件元数据
- `POST /projects/:id/snapshots`
  - 保存当前编辑态

建议补充：

- `GET /project-assets`
  - 获取当前用户历史资产列表
  - 支持按 `image` / `video` 筛选

---

## 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 全屏页侧栏过多影响画布面积 | 中 | 采用可折叠浮层 |
| 本地项目结构升级兼容性差 | 中 | 增加版本字段 |
| 上传、资源库、卡片渲染耦合在单页里 | 中 | 将资源库、上传校验、缩放句柄拆分为独立组件 / composable |
