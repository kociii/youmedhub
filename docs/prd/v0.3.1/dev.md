# v0.3.1 技术开发文档

> 项目编辑增强的技术方案

---

## 当前基线

参考文件：

- `src/App.vue`
- `src/router/index.ts`
- `src/components/layout/AppLayout.vue`
- `src/components/ResultToolbar.vue`

### 结论

- `v0.3.0` 已提供项目管理与全屏项目画布。
- `v0.3.1` 主要在项目编辑器内增量演进，不大改主应用业务流。

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

---

## 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 全屏页侧栏过多影响画布面积 | 中 | 采用可折叠浮层 |
| 本地项目结构升级兼容性差 | 中 | 增加版本字段 |
